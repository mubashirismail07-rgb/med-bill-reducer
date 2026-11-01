const router = require("express").Router();
const c = require("../controllers/billController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");
const limits = require("../config/limits");
router.get("/limits", (_req, res) =>
  res.json({
    maxBytes: limits.maxBytes,
    maxPages: limits.maxPages,
    timeoutMs: limits.timeoutMs,
    retentionHours: limits.retentionMs / 3600000,
  }),
);
router.use(protect);
router.post("/upload", upload.single("bill"), c.uploadBill);
router.get("/", c.getUserBills);
router.get("/:id", c.getBillById);
router.post("/:id/process", c.processBill);
router.put("/:id/review", c.reviewBill);
router.post("/:id/analyze", c.analyzeBillWithAI);
// Compatibility aliases use the same resumable pipeline and review gate.
router.post("/:id/extract", c.processBill);
router.post("/:id/parse", c.processBill);
router.post("/:id/rule-check", c.analyzeBillWithAI);
router.post(
  "/:id/original",
  async (req, res, next) => {
    try {
      await c.owned(req);
      next();
    } catch (e) {
      next(e);
    }
  },
  upload.single("bill"),
  c.replaceOriginal,
);
router.delete("/:id", c.deleteBill);
module.exports = router;
