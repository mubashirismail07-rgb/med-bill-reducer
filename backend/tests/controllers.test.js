const { test } = require("node:test");
const assert = require("node:assert/strict");
const Bill = require("../src/models/Bill");
const c = require("../src/controllers/billController");
const { downloadReport } = require("../src/controllers/reportController");
const req = { params: { id: "synthetic" }, user: { _id: "owner" }, body: {} };
async function invoke(fn, request = req) {
  let error, body;
  const res = { json: (b) => (body = b), status: () => res };
  await fn(request, res, (e) => (error = e));
  return { error, body };
}
test("all bill mutations and report requests enforce ownership", async () => {
  const original = Bill.findOne;
  const filters = [];
  Bill.findOne = async (query) => {
    filters.push(query);
    return null;
  };
  try {
    for (const fn of [
      c.getBillById,
      c.processBill,
      c.reviewBill,
      c.analyzeBillWithAI,
      c.deleteBill,
      c.replaceOriginal,
    ]) {
      assert.equal((await invoke(fn)).error.status, 404);
    }
    const report = await invoke(downloadReport);
    assert.equal(report.body.message, "Bill not found");
    assert.ok(filters.every((f) => f.userId === "owner"));
  } finally {
    Bill.findOne = original;
  }
});
test("resume skips saved extraction and complete analysis, review invalidates analysis", async () => {
  const original = Bill.findOne;
  const bill = {
    _id: "synthetic",
    parsedData: [
      {
        id: "row-1",
        item: "Test",
        amount: 10,
        page: 1,
        sourceText: "Test 10.00",
      },
    ],
    reviewedAt: new Date(),
    processing: { stage: "complete" },
    aiAnalysis: { aiStatus: "complete" },
    extraction: {},
    save: async () => {},
  };
  Bill.findOne = async () => bill;
  try {
    const old = bill.aiAnalysis;
    await invoke(c.processBill);
    await invoke(c.analyzeBillWithAI);
    assert.equal(bill.aiAnalysis, old);
    await invoke(c.reviewBill, {
      ...req,
      body: {
        rows: [{ id: "row-1", item: "Test", amount: 20 }],
        currency: "AED",
        printedTotal: 20,
        adjustments: [],
      },
    });
    assert.equal(bill.aiAnalysis, null);
    assert.equal(bill.processing.stage, "analyze");
    assert.equal(bill.parsedData[0].sourceText, "Test 10.00");
    assert.equal(bill.currency, "AED");
    assert.equal(bill.revision, 1);
  } finally {
    Bill.findOne = original;
  }
});
test("analysis requires review and unavailable AI saves rules without complete state", async () => {
  const original = Bill.findOne;
  const key = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const bill = {
    _id: "synthetic",
    parsedData: [{ id: "a", item: "Test", amount: 10 }],
    processing: { stage: "review" },
    save: async () => {},
  };
  Bill.findOne = async () => bill;
  try {
    assert.equal((await invoke(c.analyzeBillWithAI)).error.status, 400);
    bill.reviewedAt = new Date();
    await invoke(c.analyzeBillWithAI);
    assert.equal(bill.aiAnalysis.aiStatus, "unavailable");
    assert.equal(bill.processing.stage, "failed");
    assert.equal(bill.processing.failedStage, "analyze");
    assert.ok(bill.aiAnalysis.ruleBasedFlags);
  } finally {
    Bill.findOne = original;
    if (key) process.env.GROQ_API_KEY = key;
  }
});
