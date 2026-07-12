const path = require("path");
const Bill = require("../models/Bill");



const uploadBill = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fileType = fileExt === ".pdf" ? "pdf" : "image";

    const bill = await Bill.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType,
    });

    res.status(201).json({
      message: "Bill uploaded successfully",
      bill,
    });
  } catch (err) {
    next(err);
  }
};

const getUserBills = async (req, res, next) => {
  try {
    const bills = await Bill.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    next(err);
  }
};

const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (err) {
    next(err);
  }
};
const { extractTextFromFile } = require("../services/ocrService");

// @desc    Extract text from uploaded bill using OCR
// @route   POST /api/bills/:id/extract
const extractBillText = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.extractedText) {
      return res.status(400).json({ message: "Text already extracted for this bill" });
    }

    const extractedText = await extractTextFromFile(bill.filePath, bill.fileType);

    bill.extractedText = extractedText;
    await bill.save();

    res.json({
      message: "Text extracted successfully",
      billId: bill._id,
      extractedText,
    });
  } catch (err) {
    next(err);
  }
};
const { parseBillText } = require("../services/parserService");

// @desc    Parse extracted text into structured billing data
// @route   POST /api/bills/:id/parse
const parseBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (!bill.extractedText) {
      return res.status(400).json({ message: "No extracted text found. Run OCR extraction first." });
    }

    if (bill.parsedData && bill.parsedData.length > 0) {
      return res.status(400).json({ message: "Bill already parsed" });
    }

    const parsedResult = parseBillText(bill.extractedText);

    bill.parsedData = parsedResult.lineItems;
    await bill.save();

    res.json({
      message: "Bill parsed successfully",
      billId: bill._id,
      totalAmount: parsedResult.totalAmount,
      itemCount: parsedResult.itemCount,
      parsedData: parsedResult.lineItems,
    });
  } catch (err) {
    next(err);
  }
};
const { analyzeBill } = require("../services/aiService");

// @desc    Run AI analysis on parsed bill
// @route   POST /api/bills/:id/analyze
const analyzeBillWithAI = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (!bill.parsedData || bill.parsedData.length === 0) {
      return res.status(400).json({ message: "No parsed data found. Run parsing first." });
    }

    if (bill.aiAnalysis) {
      return res.status(400).json({ message: "AI analysis already exists for this bill" });
    }

    const analysis = await analyzeBill(bill.parsedData, bill.extractedText);

    bill.aiAnalysis = analysis;
    await bill.save();

    res.json({
      message: "AI analysis complete",
      billId: bill._id,
      aiAnalysis: analysis,
    });
  } catch (err) {
    next(err);
  }
};
const { runRuleBasedChecks } = require("../services/ruleService");

// @desc    Run rule-based checks on parsed bill
// @route   POST /api/bills/:id/rule-check
const runRuleCheck = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (!bill.parsedData || bill.parsedData.length === 0) {
      return res.status(400).json({ message: "No parsed data found. Run parsing first." });
    }

    const ruleBasedFlags = runRuleBasedChecks(bill.parsedData);

    // Merge into existing aiAnalysis or create a new object
    const updatedAnalysis = {
      ...(bill.aiAnalysis || {}),
      ruleBasedFlags,
    };

    bill.aiAnalysis = updatedAnalysis;
    await bill.save();

    res.json({
      message: "Rule-based analysis complete",
      billId: bill._id,
      ruleBasedFlags,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadBill, getUserBills, getBillById, extractBillText,parseBill,analyzeBillWithAI,runRuleCheck };
