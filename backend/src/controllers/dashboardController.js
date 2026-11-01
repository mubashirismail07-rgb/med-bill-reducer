const Bill = require("../models/Bill");
const { serialize } = require("../services/billSummary");
const { deleteBill } = require("./billController");
const getDashboardStats = async (req, res, next) => {
  try {
    const bills = (await Bill.find({ userId: req.user._id })).map(serialize);
    const totals = {};
    for (const b of bills) {
      if (b.currency && b.reviewedAt)
        totals[b.currency] =
          (totals[b.currency] || 0) +
          (b.summary.printedTotal ?? b.summary.expectedTotal);
    }
    res.json({
      totalBills: bills.length,
      analyzed: bills.filter((b) => b.summary.complete).length,
      needsReview: bills.filter((b) => b.summary.needsReview).length,
      totalBilledByCurrency: totals,
    });
  } catch (e) {
    next(e);
  }
};
const getBillHistory = async (req, res, next) => {
  try {
    res.json({
      bills: (
        await Bill.find({ userId: req.user._id }).sort({ createdAt: -1 })
      ).map(serialize),
    });
  } catch (e) {
    next(e);
  }
};
module.exports = { getDashboardStats, getBillHistory, deleteBill };
