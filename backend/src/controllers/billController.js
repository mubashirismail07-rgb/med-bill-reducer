const Bill = require("../models/Bill");
const { extractPages, validateFile } = require("../services/ocrService");
const { parseBillText } = require("../services/parserService");
const { analyzeBill } = require("../services/aiService");
const { runRuleBasedChecks } = require("../services/ruleService");
const { serialize } = require("../services/billSummary");
const { removeOriginal } = require("../services/storageService");
const { retentionMs } = require("../config/limits");
const locks = new Set();
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const owned = async (req) => {
  const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });
  if (!bill) throw fail("Bill not found", 404);
  return bill;
};
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (req.file) await removeOriginal(req.file.path).catch(() => {});
    next(err);
  }
};
const exclusive = (fn) =>
  wrap(async (req, res) => {
    const bill = await owned(req);
    const id = String(bill._id);
    if (locks.has(id))
      throw fail("This bill is already processing. Wait, then refresh.", 409);
    locks.add(id);
    try {
      await fn(req, res, bill);
    } finally {
      locks.delete(id);
    }
  });
const uploadBill = wrap(async (req, res) => {
  if (!req.file) throw fail("Select a file first.");
  try {
    const fileType = req.file.mimetype === "application/pdf" ? "pdf" : "image";
    const actual = await validateFile(req.file.path, fileType);
    if (actual !== req.file.mimetype)
      throw fail(
        "File contents do not match its extension and MIME type.",
        415,
      );
    const bill = await Bill.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType,
      originalExpiresAt: new Date(Date.now() + retentionMs),
      processing: { stage: "uploaded" },
    });
    res.status(201).json({ bill: serialize(bill) });
  } catch (err) {
    await removeOriginal(req.file.path);
    throw err;
  }
});
const processBill = exclusive(async (_req, res, bill) => {
  if (bill.reviewedAt || bill.processing?.stage === "review")
    return res.json({ bill: serialize(bill) });
  let stage = "read";
  try {
    if (!bill.extractedText) {
      bill.processing = { stage };
      await bill.save();
      if (
        bill.originalExpiresAt &&
        new Date(bill.originalExpiresAt) < new Date()
      ) {
        await removeOriginal(bill.filePath);
        throw fail(
          "The temporary original expired. Reattach the same bill to resume.",
          410,
        );
      }
      bill.pages = await extractPages(bill.filePath, bill.fileType);
      bill.extractedText = bill.pages
        .map((p) => `--- Page ${p.page} ---\n${p.text}`)
        .join("\n");
      bill.processing = { stage: "extract" };
      await bill.save();
      await removeOriginal(bill.filePath);
    }
    stage = "extract";
    bill.processing = { stage };
    await bill.save();
    const result = parseBillText(bill.extractedText);
    bill.parsedData = result.lineItems;
    bill.currency = result.currency;
    bill.extraction = result;
    bill.processing = { stage: "review" };
    await bill.save();
    res.json({ bill: serialize(bill) });
  } catch (err) {
    bill.processing = {
      stage: "failed",
      failedStage: stage,
      message: err.message,
    };
    await bill.save();
    throw err;
  }
});
const reviewBill = exclusive(async (req, res, bill) => {
  const { rows, currency, printedTotal, adjustments } = req.body;
  const validMoney = (n) =>
    typeof n === "number" &&
    Number.isFinite(n) &&
    Math.abs(n) < 1e9 &&
    Math.abs(n * 100 - Math.round(n * 100)) < 0.0001;
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > 300 ||
    !["USD", "INR", "AED", "EUR", "GBP", "CAD", "AUD"].includes(currency)
  )
    throw fail("Provide 1–300 charges and select a supported currency.");
  if (
    rows.some(
      (r) =>
        !r ||
        typeof r.item !== "string" ||
        !r.item.trim() ||
        r.item.length > 500 ||
        !validMoney(r.amount) ||
        (r.quantity != null &&
          (!Number.isFinite(r.quantity) || r.quantity <= 0)) ||
        (r.unitPrice != null && !validMoney(r.unitPrice)),
    )
  )
    throw fail(
      "Each charge needs a description and valid amount, quantity and unit price.",
    );
  if (printedTotal !== null && !validMoney(printedTotal))
    throw fail("Enter a valid printed total or leave it blank.");
  if (
    !Array.isArray(adjustments) ||
    adjustments.length > 50 ||
    adjustments.some(
      (a) =>
        !a ||
        typeof a.item !== "string" ||
        a.item.length > 100 ||
        !validMoney(a.amount),
    )
  )
    throw fail("Invalid tax or discount adjustments.");
  const existing = new Map(
    bill.parsedData.map((r, i) => [r.id || `row-${i + 1}`, r]),
  );
  bill.parsedData = rows.map((r, i) => {
    const source = existing.get(r.id);
    return {
      id: `row-${i + 1}`,
      item: r.item.trim(),
      amount: r.amount,
      quantity: r.quantity ?? null,
      unitPrice: r.unitPrice ?? null,
      sourceText: source?.sourceText || null,
      page: source?.page || null,
      warning:
        r.quantity != null &&
        r.unitPrice != null &&
        Math.abs(r.quantity * r.unitPrice - r.amount) > 0.01
          ? "Quantity × unit price differs from line total."
          : null,
    };
  });
  bill.currency = currency;
  bill.extraction = { ...(bill.extraction || {}), printedTotal, adjustments };
  bill.reviewedAt = new Date();
  bill.revision = (bill.revision || 0) + 1;
  bill.aiAnalysis = null;
  bill.processing = { stage: "analyze" };
  await bill.save();
  res.json({ bill: serialize(bill) });
});
const analyzeBillWithAI = exclusive(async (_req, res, bill) => {
  if (!bill.reviewedAt)
    throw fail("Review and confirm the extracted charges before analysis.");
  if (bill.processing?.stage === "complete")
    return res.json({ bill: serialize(bill) });
  const ruleBasedFlags = runRuleBasedChecks(bill.parsedData, bill.currency);
  bill.aiAnalysis = { ruleBasedFlags, aiStatus: "pending" };
  bill.processing = { stage: "analyze" };
  await bill.save();
  try {
    const ai = await analyzeBill(bill.parsedData, bill.currency);
    bill.aiAnalysis = { ...ai, ruleBasedFlags, aiStatus: "complete" };
    bill.processing = { stage: "complete" };
  } catch {
    bill.aiAnalysis = { ruleBasedFlags, aiStatus: "unavailable" };
    bill.processing = {
      stage: "failed",
      failedStage: "analyze",
      message:
        "AI suggestions are unavailable or invalid. Rule findings are saved. Retry analysis later.",
    };
  }
  await bill.save();
  res.json({ bill: serialize(bill) });
});
const replaceOriginal = exclusive(async (req, res, bill) => {
  if (!req.file) throw fail("Select the original file.");
  try {
    if (bill.extractedText)
      throw fail("Text is already saved; resume without reattaching.");
    const type = req.file.mimetype === "application/pdf" ? "pdf" : "image";
    const actual = await validateFile(req.file.path, type);
    if (actual !== req.file.mimetype)
      throw fail("File contents do not match its type.", 415);
    await removeOriginal(bill.filePath);
    bill.filePath = req.file.path;
    bill.fileName = req.file.originalname;
    bill.fileType = type;
    bill.originalExpiresAt = new Date(Date.now() + retentionMs);
    bill.processing = { stage: "uploaded" };
    await bill.save();
    res.json({ bill: serialize(bill) });
  } catch (err) {
    await removeOriginal(req.file.path);
    throw err;
  }
});
const getUserBills = wrap(async (req, res) =>
  res.json(
    (await Bill.find({ userId: req.user._id }).sort({ createdAt: -1 })).map(
      serialize,
    ),
  ),
);
const getBillById = wrap(async (req, res) =>
  res.json(serialize(await owned(req))),
);
const deleteBill = exclusive(async (_req, res, bill) => {
  await removeOriginal(bill.filePath);
  await bill.deleteOne();
  res.json({ message: "Bill deleted" });
});
module.exports = {
  uploadBill,
  processBill,
  reviewBill,
  analyzeBillWithAI,
  replaceOriginal,
  getUserBills,
  getBillById,
  deleteBill,
  owned,
};
