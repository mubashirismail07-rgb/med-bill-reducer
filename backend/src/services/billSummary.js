const { round } = require("./parserService");
function summarize(bill) {
  const rows = bill.parsedData || [];
  const lineTotal = round(
    rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
  );
  const adjustments = round(
    (bill.extraction?.adjustments || []).reduce((sum, r) => sum + r.amount, 0),
  );
  const printedTotal = bill.extraction?.printedTotal ?? null;
  const expectedTotal = round(lineTotal + adjustments);
  const discrepancy =
    printedTotal === null ? null : round(expectedTotal - printedTotal);
  const ruleFindings = bill.aiAnalysis?.ruleBasedFlags?.findings || [];
  const suggestions = bill.aiAnalysis?.suggestions || [];
  const affectedCharges = new Set(
    [...ruleFindings, ...suggestions].flatMap((f) => f.rowIds || []),
  ).size;
  const complete =
    bill.processing?.stage === "complete" &&
    !!bill.reviewedAt &&
    bill.aiAnalysis?.aiStatus === "complete";
  const stage =
    bill.processing?.stage ||
    (rows.length ? "review" : bill.extractedText ? "extract" : "uploaded");
  return {
    lineTotal,
    adjustments,
    expectedTotal,
    printedTotal,
    discrepancy,
    currency: bill.currency || null,
    stage,
    complete,
    ruleFindings,
    suggestions,
    affectedCharges,
    needsReview:
      !complete ||
      affectedCharges > 0 ||
      (discrepancy !== null && Math.abs(discrepancy) > 0.01),
    status: complete
      ? affectedCharges || Math.abs(discrepancy || 0) > 0.01
        ? "Needs attention"
        : "No issues flagged"
      : stage === "failed"
        ? "Processing interrupted"
        : stage === "review"
          ? "Review charges"
          : stage === "analyze"
            ? "Analysis incomplete"
            : "Processing incomplete",
  };
}
function serialize(bill) {
  const obj = bill.toObject ? bill.toObject() : { ...bill };
  delete obj.filePath;
  delete obj.userId;
  return { ...obj, summary: summarize(bill) };
}
module.exports = { summarize, serialize };
