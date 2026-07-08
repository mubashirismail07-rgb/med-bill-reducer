const express = require("express");
const { uploadBill, getUserBills, getBillById } = require("../controllers/billController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const router = express.Router();

router.post("/upload", protect, upload.single("bill"), uploadBill);
router.get("/", protect, getUserBills);
router.get("/:id", protect, getBillById);

module.exports = router;