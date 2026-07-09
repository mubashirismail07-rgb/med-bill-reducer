const express = require("express");
const { uploadBill, getUserBills, getBillById,parseBill } = require("../controllers/billController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");
const { extractBillText } = require('../controllers/billController.js')

const router = express.Router();

router.post("/upload", protect, upload.single("bill"), uploadBill);
router.get("/", protect, getUserBills);
router.get("/:id", protect, getBillById);
router.post("/:id/extract", protect, extractBillText);
router.post("/:id/parse", protect, parseBill);

module.exports = router;