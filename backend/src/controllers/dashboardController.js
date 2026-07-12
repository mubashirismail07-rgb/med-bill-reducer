const Bill = require("../models/Bill");

// @desc    Get dashboard summary stats for logged-in user
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const bills = await Bill.find({ userId: req.user._id });

    if (bills.length === 0) {
      return res.json({
        totalBills: 0,
        totalSpent: 0,
        totalFlagsFound: 0,
        totalDuplicatesFound: 0,
        totalSuspiciousFound: 0,
        averageBillAmount: 0,
        mostRecentBill: null,
      });
    }

    // Total spent across all bills
    const totalSpent = bills.reduce((sum, bill) => {
      const items = bill.parsedData || [];
      const billTotal = items.reduce((s, item) => {
        const i = item.toObject ? item.toObject() : item;
        return s + (i.amount || 0);
      }, 0);
      return sum + billTotal;
    }, 0);

    // Total flags across all bills
    let totalFlagsFound = 0;
    let totalDuplicatesFound = 0;
    let totalSuspiciousFound = 0;

    for (const bill of bills) {
      const analysis = bill.aiAnalysis;
      if (!analysis) continue;

      const ruleFlags = analysis.ruleBasedFlags;
      if (ruleFlags) {
        totalFlagsFound += ruleFlags.totalFlagsFound || 0;
        totalDuplicatesFound += (ruleFlags.duplicateCharges || []).length;
      }

      const suspiciousCharges = analysis.suspiciousCharges;
      if (suspiciousCharges) {
        totalSuspiciousFound += suspiciousCharges.length;
      }
    }

    const averageBillAmount = parseFloat((totalSpent / bills.length).toFixed(2));

    const mostRecentBill = bills.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    res.json({
      totalBills: bills.length,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalFlagsFound,
      totalDuplicatesFound,
      totalSuspiciousFound,
      averageBillAmount,
      mostRecentBill: {
        _id: mostRecentBill._id,
        fileName: mostRecentBill.fileName,
        uploadDate: mostRecentBill.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get full bill history with optional status filter
// @route   GET /api/dashboard/history
const getBillHistory = async (req, res, next) => {
  try {
    const { status } = req.query;

    const bills = await Bill.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    const history = bills.map((bill) => {
      const items = (bill.parsedData || []).map((i) =>
        i.toObject ? i.toObject() : i
      );

      const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);

      const analysisStatus = bill.aiAnalysis
        ? "complete"
        : bill.parsedData && bill.parsedData.length > 0
        ? "parsed"
        : bill.extractedText
        ? "extracted"
        : "uploaded";

      const flagCount = bill.aiAnalysis?.ruleBasedFlags?.totalFlagsFound || 0;

      return {
        _id: bill._id,
        fileName: bill.fileName,
        fileType: bill.fileType,
        uploadDate: bill.createdAt,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        itemCount: items.length,
        analysisStatus,
        flagCount,
        hasIssues: flagCount > 0,
      };
    });

    // Filter by status if provided
    const filtered = status
      ? history.filter((b) => b.analysisStatus === status)
      : history;

    res.json({
      totalBills: filtered.length,
      bills: filtered,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a bill
// @route   DELETE /api/dashboard/bills/:id
const deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Delete the uploaded file from disk
    const fs = require("fs");
    if (fs.existsSync(bill.filePath)) {
      fs.unlinkSync(bill.filePath);
    }

    await bill.deleteOne();

    res.json({ message: "Bill deleted successfully", billId: req.params.id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getBillHistory, deleteBill };