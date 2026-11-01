const PDFDocument = require("pdfkit");
const fs = require("fs");
const { summarize } = require("./billSummary");
function generateBillReport(bill, res) {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="MedReduce-Report-${bill._id}.pdf"`,
  );
  doc.pipe(res);
  const font =
    process.env.REPORT_FONT_PATH ||
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  if (fs.existsSync(font)) doc.font(font);
  // Currency codes avoid ambiguous symbols and unsupported glyphs in fallback fonts.
  const money = (n) =>
    n == null
      ? "Not recorded"
      : `${bill.currency || "Currency unknown"} ${Number(n).toFixed(2)}`;
  const s = summarize(bill);
  const bottom = doc.page.height - 65;
  const room = (h) => {
    if (doc.y + h > bottom) doc.addPage();
  };
  const text = (value, size = 10, color = "#344d59") => {
    doc.fontSize(size).fillColor(color);
    doc.text(String(value), 48, doc.y, { width: 499, lineGap: 3 });
  };
  const section = (title) => {
    room(80);
    doc.moveDown(0.8);
    text(title, 14, "#176d77");
    doc.moveDown(0.4);
  };
  text("MedReduce AI", 24, "#176d77");
  text("MEDICAL BILL REVIEW", 9, "#687e88");
  doc.moveDown();
  text(bill.fileName, 12);
  text(`Uploaded: ${new Date(bill.createdAt).toISOString().slice(0, 10)}`);
  text(`Status: ${s.status}`);
  text(
    "Review support only. Possible issues are not confirmed errors or guaranteed savings.",
    9,
  );
  doc.moveDown();
  text(`Printed bill total: ${money(s.printedTotal)}`, 13);
  text(`Extracted charge sum: ${money(s.lineTotal)}`);
  text(`Taxes / discounts / credits: ${money(s.adjustments)}`);
  text(`Charges plus adjustments: ${money(s.expectedTotal)}`);
  text(`Difference from printed total: ${money(s.discrepancy)}`);
  text(`Distinct flagged charges: ${s.affectedCharges}`);
  section("Itemized charges");
  const header = () => {
    const y = doc.y;
    doc.rect(48, y, 499, 25).fill("#edf4f5");
    doc.fillColor("#375963").fontSize(9);
    doc.text("CHARGE / SOURCE", 58, y + 7, { width: 310 });
    doc.text("AMOUNT", 380, y + 7, { width: 155, align: "right" });
    doc.y = y + 32;
  };
  header();
  for (const [index, row] of (bill.parsedData || []).entries()) {
    const description = `${index + 1}. ${row.item}\n${row.page ? `Page ${row.page}` : "Source not recorded"}${row.quantity != null ? ` | Qty ${row.quantity}` : ""}${row.unitPrice != null ? ` | Unit ${money(row.unitPrice)}` : ""}`;
    doc.fontSize(10);
    const height =
      Math.max(
        doc.heightOfString(description, { width: 315, lineGap: 3 }),
        30,
      ) + 18;
    if (doc.y + height > bottom) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    doc
      .fillColor("#344d59")
      .text(description, 58, y, { width: 315, lineGap: 3 });
    doc.text(money(row.amount), 380, y, { width: 155, align: "right" });
    doc
      .moveTo(48, y + height - 7)
      .lineTo(547, y + height - 7)
      .strokeColor("#e1e8eb")
      .stroke();
    doc.y = y + height;
  }
  if (bill.extraction?.adjustments?.length) {
    section("Adjustments");
    for (const a of bill.extraction.adjustments) {
      room(40);
      text(`${a.item}: ${money(a.amount)}`);
    }
  }
  section("Rule findings");
  if (!s.ruleFindings.length)
    text(
      bill.reviewedAt && bill.aiAnalysis?.ruleBasedFlags
        ? "No issues flagged by configured rules."
        : "Rule analysis has not completed.",
    );
  for (const f of s.ruleFindings) {
    room(95);
    text(
      f.kind === "possible_duplicate" ? "Possible duplicate" : "Review flag",
      11,
      "#906019",
    );
    text(f.message);
    text(
      `Charges: ${f.rowIds.join(", ")}${f.pages?.length ? ` | Pages: ${f.pages.join(", ")}` : ""}`,
      9,
    );
    doc.moveDown(0.5);
  }
  section("AI suggestions — verify with your provider");
  text(
    bill.aiAnalysis?.aiStatus === "complete"
      ? bill.aiAnalysis.summary || "No summary provided."
      : "AI analysis is incomplete or unavailable.",
  );
  for (const f of s.suggestions) {
    room(75);
    text(`${f.message}\nCharges: ${f.rowIds.join(", ")}`);
    doc.moveDown(0.5);
  }
  section("Questions for your provider");
  const questions = bill.aiAnalysis?.questions?.length
    ? bill.aiAnalysis.questions
    : [
        "Can you explain the itemized charges and any repeated services?",
        "Does the total include all taxes, credits and discounts?",
      ];
  for (const [i, q] of questions.entries()) {
    room(55);
    text(`${i + 1}. ${q}`);
    doc.moveDown(0.5);
  }
  section("Extraction notes");
  text(
    "Compare this report with the original bill. OCR and parsing can miss or misread charges. Currency and rows may have been edited by the account owner.",
  );
  if (bill.extraction?.ambiguous?.length)
    text(
      `${bill.extraction.ambiguous.length} source lines could not be confidently parsed. Review the saved source text in the app.`,
    );
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc
      .fontSize(8)
      .fillColor("#70848e")
      .text(
        `MedReduce AI  |  Review support                    Page ${i + 1} of ${range.count}`,
        48,
        doc.page.height - 42,
        { width: 499, lineBreak: false },
      );
  }
  doc.end();
  return doc;
}
module.exports = { generateBillReport };
