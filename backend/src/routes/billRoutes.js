const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const router = express.Router();
const {
  uploadBill,
  getUserBills,
  getBillById,
  extractBillText,
  parseBill,
  analyzeBill,
  analyzeBillWithAI,
} = require("../controllers/billController");

router.post("/upload", protect, upload.single("bill"), uploadBill);
router.get("/", protect, getUserBills);
router.get("/:id", protect, getBillById);
router.post("/:id/extract", protect, extractBillText);
router.post("/:id/parse", protect, parseBill);
router.post("/:id/analyze", protect, analyzeBillWithAI);

module.exports = router;