const Bill = require("../models/Bill");
const { generateBillReport } = require("../services/reportService");

// @desc    Generate and download PDF report for a bill
// @route   GET /api/reports/:id
const downloadReport = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (!bill.parsedData || bill.parsedData.length === 0) {
      return res.status(400).json({
        message: "Bill has no parsed data. Run extraction and parsing first.",
      });
    }

    generateBillReport(bill, res);
  } catch (err) {
    next(err);
  }
};

module.exports = { downloadReport };