const fs = require("fs");
const path = require("path");
const { generateBillReport } = require("../src/services/reportService");
const { runRuleBasedChecks } = require("../src/services/ruleService");
async function render(currency, count) {
  fs.mkdirSync(path.resolve(__dirname, "../../artifacts"), { recursive: true });
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `row-${i + 1}`,
    item:
      i % 5 === 0
        ? "Extended diagnostic consultation and detailed laboratory examination with a long description for wrapping verification"
        : "Blood count",
    amount: i % 5 === 0 ? 120 : 45,
    quantity: 1,
    unitPrice: i % 5 === 0 ? 120 : 45,
    page: Math.floor(i / 15) + 1,
  }));
  const bill = {
    _id: `sample-${currency}`,
    fileName: `FICTIONAL SAMPLE - ${currency}.pdf`,
    createdAt: new Date("2026-01-15"),
    currency,
    parsedData: rows,
    reviewedAt: new Date(),
    processing: { stage: "complete" },
    extraction: {
      printedTotal: rows.reduce((s, r) => s + r.amount, 0) - 20,
      adjustments: [{ item: "Discount", amount: -20 }],
    },
    aiAnalysis: {
      aiStatus: "complete",
      summary:
        "Prewritten sample guidance. Ask whether repeated charges represent separate services.",
      suggestions: [],
      questions: ["Were repeated services provided on different occasions?"],
      ruleBasedFlags: runRuleBasedChecks(rows, currency),
    },
  };
  const out = fs.createWriteStream(
    path.resolve(__dirname, `../../artifacts/report-${currency}.pdf`),
  );
  out.setHeader = () => {};
  generateBillReport(bill, out);
  await new Promise((r) => out.on("finish", r));
}
(async () => {
  for (const c of ["USD", "INR", "AED"]) await render(c, c === "USD" ? 65 : 8);
  console.log("Synthetic reports generated");
})();
