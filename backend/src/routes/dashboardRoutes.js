const express = require("express");
const {
  getDashboardStats,
  getBillHistory,
  deleteBill,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/stats", protect, getDashboardStats);
router.get("/history", protect, getBillHistory);
router.delete("/bills/:id", protect, deleteBill);

module.exports = router;