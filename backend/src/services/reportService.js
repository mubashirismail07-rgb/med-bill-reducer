const PDFDocument = require("pdfkit");

const generateBillReport = (bill, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Stream directly to response
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=MedReduce-Report-${bill._id}.pdf`
  );
  doc.pipe(res);

  const primaryColor = "#2563eb";
  const dangerColor = "#dc2626";
  const warningColor = "#d97706";
  const successColor = "#16a34a";
  const grayColor = "#6b7280";

  // ── Header ──────────────────────────────────────────────
  doc
    .fillColor(primaryColor)
    .fontSize(24)
    .text("MedReduce AI", { align: "center" })
    .fontSize(12)
    .fillColor(grayColor)
    .text("Medical Bill Analysis Report", { align: "center" })
    .moveDown(0.5);

  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .strokeColor(primaryColor)
    .stroke()
    .moveDown(1);

  // ── Bill Info ────────────────────────────────────────────
  doc
    .fillColor("#111827")
    .fontSize(14)
    .text("Bill Information", { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).fillColor("#374151");
  doc.text(`File Name: ${bill.fileName}`);
  doc.text(`Upload Date: ${new Date(bill.createdAt).toLocaleDateString()}`);
  doc.text(`Report Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1);

  // ── Parsed Line Items ────────────────────────────────────
  const items = (bill.parsedData || []).map((i) =>
    i.toObject ? i.toObject() : i
  );
  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  doc
    .fillColor("#111827")
    .fontSize(14)
    .text("Itemized Charges", { underline: true })
    .moveDown(0.5);

  if (items.length === 0) {
    doc.fontSize(11).fillColor(grayColor).text("No parsed items available.");
  } else {
    // Table header
    doc.fontSize(11).fillColor(primaryColor);
    doc.text("Item", 50, doc.y, { width: 350, continued: true });
    doc.text("Amount", { width: 100, align: "right" });

    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor("#e5e7eb")
      .stroke();

    // Table rows
    for (const item of items) {
      doc.fillColor("#374151").fontSize(10);
      const y = doc.y + 4;
      doc.text(item.item, 50, y, { width: 350, continued: true });
      doc.text(`$${item.amount.toFixed(2)}`, { width: 100, align: "right" });
    }

    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor("#e5e7eb")
      .stroke()
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("#111827")
      .text("Total Amount", 50, doc.y, { width: 350, continued: true })
      .fillColor(primaryColor)
      .text(`$${totalAmount.toFixed(2)}`, { width: 100, align: "right" });
  }

  doc.moveDown(1.5);

  // ── AI Summary ───────────────────────────────────────────
  const ai = bill.aiAnalysis;

  if (ai && ai.summary) {
    doc
      .fillColor("#111827")
      .fontSize(14)
      .text("AI Summary", { underline: true })
      .moveDown(0.5);

    doc.fontSize(11).fillColor("#374151").text(ai.summary).moveDown(1.5);
  }

  // ── Rule-Based Flags ─────────────────────────────────────
  if (ai && ai.ruleBasedFlags) {
    const flags = ai.ruleBasedFlags;

    doc
      .fillColor("#111827")
      .fontSize(14)
      .text("Issues Detected", { underline: true })
      .moveDown(0.5);

    if (!flags.hasIssues) {
      doc
        .fontSize(11)
        .fillColor(successColor)
        .text("✓ No issues detected by the rule-based engine.")
        .moveDown(1);
    } else {
      // Duplicate charges
      if (flags.duplicateCharges && flags.duplicateCharges.length > 0) {
        doc
          .fontSize(12)
          .fillColor(dangerColor)
          .text("Duplicate Charges")
          .moveDown(0.3);
        for (const flag of flags.duplicateCharges) {
          doc
            .fontSize(10)
            .fillColor("#374151")
            .text(`• ${flag.message}`)
            .moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      // Repeated lab tests
      if (flags.repeatedLabTests && flags.repeatedLabTests.length > 0) {
        doc
          .fontSize(12)
          .fillColor(warningColor)
          .text("Repeated Lab Tests")
          .moveDown(0.3);
        for (const flag of flags.repeatedLabTests) {
          doc
            .fontSize(10)
            .fillColor("#374151")
            .text(`• ${flag.message}`)
            .moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      // High cost items
      if (flags.highCostItems && flags.highCostItems.length > 0) {
        doc
          .fontSize(12)
          .fillColor(warningColor)
          .text("High Cost Items")
          .moveDown(0.3);
        for (const flag of flags.highCostItems) {
          doc
            .fontSize(10)
            .fillColor("#374151")
            .text(`• ${flag.message}`)
            .moveDown(0.3);
        }
        doc.moveDown(0.5);
      }

      // Missing descriptions
      if (flags.missingDescriptions && flags.missingDescriptions.length > 0) {
        doc
          .fontSize(12)
          .fillColor(grayColor)
          .text("Missing Descriptions")
          .moveDown(0.3);
        for (const flag of flags.missingDescriptions) {
          doc
            .fontSize(10)
            .fillColor("#374151")
            .text(`• ${flag.message}`)
            .moveDown(0.3);
        }
        doc.moveDown(0.5);
      }
    }
  }

  // ── Suspicious Charges ───────────────────────────────────
  if (ai && ai.suspiciousCharges && ai.suspiciousCharges.length > 0) {
    doc
      .fillColor("#111827")
      .fontSize(14)
      .text("Suspicious Charges", { underline: true })
      .moveDown(0.5);

    for (const charge of ai.suspiciousCharges) {
      doc
        .fontSize(11)
        .fillColor(dangerColor)
        .text(`${charge.item} — $${charge.amount}`)
        .fillColor("#374151")
        .fontSize(10)
        .text(`Reason: ${charge.reason}`)
        .moveDown(0.5);
    }
    doc.moveDown(0.5);
  }

  // ── Cost Saving Suggestions ──────────────────────────────
  if (ai && ai.costSavingSuggestions && ai.costSavingSuggestions.length > 0) {
    doc
      .fillColor("#111827")
      .fontSize(14)
      .text("Cost-Saving Suggestions", { underline: true })
      .moveDown(0.5);

    for (const suggestion of ai.costSavingSuggestions) {
      doc
        .fontSize(11)
        .fillColor(successColor)
        .text(`✓ ${suggestion}`)
        .moveDown(0.3);
    }
    doc.moveDown(1);
  }

  // ── Questions To Ask ─────────────────────────────────────
  if (ai && ai.questionsToAsk && ai.questionsToAsk.length > 0) {
    doc
      .fillColor("#111827")
      .fontSize(14)
      .text("Questions To Ask Your Provider", { underline: true })
      .moveDown(0.5);

    for (let i = 0; i < ai.questionsToAsk.length; i++) {
      doc
        .fontSize(11)
        .fillColor("#374151")
        .text(`${i + 1}. ${ai.questionsToAsk[i]}`)
        .moveDown(0.3);
    }
    doc.moveDown(1);
  }

  // ── Footer ───────────────────────────────────────────────
  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .strokeColor("#e5e7eb")
    .stroke()
    .moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor(grayColor)
    .text(
      "This report is generated by MedReduce AI and is intended for informational purposes only. It does not constitute medical or legal advice. Always consult a qualified professional before making decisions based on this report.",
      { align: "center" }
    );

  doc.end();
};

module.exports = { generateBillReport };