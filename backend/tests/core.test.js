const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseBillText } = require("../src/services/parserService");
const { runRuleBasedChecks } = require("../src/services/ruleService");
const { summarize } = require("../src/services/billSummary");
const { validateAnalysis } = require("../src/services/aiService");
test("parser excludes addresses, dates and IDs; reconciles quantity, discounts, tax and total", () => {
  const result = parseBillText(
    "Medical Drive Healthcare City 123\nInvoice 12345\nDate 2026/01/15\nCurrency INR\nConsultation 2 150.00 300.00\nMedicine 50.00\nSubtotal 350.00\nDiscount 20.00\nTax 10.00\nGrand Total 340.00",
  );
  assert.equal(result.lineItems.length, 2);
  assert.equal(result.lineItems[0].quantity, 2);
  assert.equal(result.lineItems[0].unitPrice, 150);
  assert.equal(result.totalAmount, 350);
  assert.equal(result.currency, "INR");
  assert.equal(result.printedTotal, 340);
  assert.equal(
    result.adjustments.reduce((s, r) => s + r.amount, 0),
    -10,
  );
});
test("unknown dollar currency stays unknown; source pages and ambiguous lines preserved", () => {
  const p = parseBillText(
    "--- Page 2 ---\nLab test $40.00\nSome header 123\nMedicine 2 50.00",
  );
  assert.equal(p.currency, null);
  assert.equal(p.lineItems[0].page, 2);
  assert.equal(p.lineItems[0].sourceText, "Lab test $40.00");
  assert.equal(p.ambiguous.length, 2);
  assert.equal(parseBillText("USD INR\nTest 10.00").currency, null);
});
test("rules use possible duplicate language, row references and currency-specific settings", () => {
  process.env.HIGH_PRICE_THRESHOLDS = '{"USD":30}';
  const rows = [
    { id: "a", item: "Blood test", amount: 40, page: 1 },
    { id: "b", item: "Blood test", amount: 40, page: 2 },
  ];
  const r = runRuleBasedChecks(rows, "USD");
  assert.equal(r.findings.length, 3);
  assert.equal(r.affectedCharges, 2);
  assert.equal(r.findings[0].kind, "possible_duplicate");
  assert.equal(runRuleBasedChecks(rows, "INR").findings.length, 1);
  delete process.env.HIGH_PRICE_THRESHOLDS;
});
test("incomplete and legacy analyses never appear complete; overlapping findings count once", () => {
  const bill = {
    parsedData: [{ amount: 40 }],
    aiAnalysis: {
      ruleBasedFlags: { findings: [{ rowIds: ["a"] }] },
      suggestions: [{ rowIds: ["a"] }],
    },
  };
  assert.equal(summarize(bill).complete, false);
  assert.equal(summarize(bill).affectedCharges, 1);
  assert.equal(summarize(bill).currency, null);
  const result = summarize({
    ...bill,
    currency: "USD",
    reviewedAt: new Date(),
    processing: { stage: "complete" },
    aiAnalysis: { ...bill.aiAnalysis, aiStatus: "complete" },
    extraction: { printedTotal: 35, adjustments: [] },
  });
  assert.equal(result.discrepancy, 5);
  assert.equal(result.status, "Needs attention");
});
test("AI output rejects malformed values and fabricated charge IDs", () => {
  const rows = [{ id: "a" }];
  assert.throws(() =>
    validateAnalysis(
      {
        summary: "ok",
        suggestions: [{ message: "Check", rowIds: ["fake"] }],
        questions: [],
      },
      rows,
    ),
  );
  assert.throws(() =>
    validateAnalysis({ summary: [], suggestions: [], questions: [] }, rows),
  );
  assert.deepEqual(
    validateAnalysis(
      {
        summary: "Overview",
        suggestions: [{ message: "Ask for explanation", rowIds: ["a"] }],
        questions: ["Why?"],
      },
      rows,
    ).suggestions[0].rowIds,
    ["a"],
  );
});

test("conflicting printed totals require review instead of silently choosing one", () => {
  const parsed = parseBillText(
    "USD\nService 50.00\nTotal 50.00\nBalance due 30.00",
  );
  assert.equal(parsed.printedTotal, null);
  assert.equal(parsed.printedTotals.length, 2);
  assert.ok(
    parsed.ambiguous.some((a) => a.reason.includes("Multiple different")),
  );
});
