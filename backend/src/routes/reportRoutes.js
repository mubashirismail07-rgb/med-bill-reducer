const express = require("express");
const { downloadReport } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:id", protect, downloadReport);

module.exports = router;