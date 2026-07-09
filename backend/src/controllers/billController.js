const path = require("path");
const Bill = require("../models/Bill");



const uploadBill = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fileType = fileExt === ".pdf" ? "pdf" : "image";

    const bill = await Bill.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType,
    });

    res.status(201).json({
      message: "Bill uploaded successfully",
      bill,
    });
  } catch (err) {
    next(err);
  }
};

const getUserBills = async (req, res, next) => {
  try {
    const bills = await Bill.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    next(err);
  }
};

const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (err) {
    next(err);
  }
};
const { extractTextFromFile } = require("../services/ocrService");

// @desc    Extract text from uploaded bill using OCR
// @route   POST /api/bills/:id/extract
const extractBillText = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.extractedText) {
      return res.status(400).json({ message: "Text already extracted for this bill" });
    }

    const extractedText = await extractTextFromFile(bill.filePath, bill.fileType);

    bill.extractedText = extractedText;
    await bill.save();

    res.json({
      message: "Text extracted successfully",
      billId: bill._id,
      extractedText,
    });
  } catch (err) {
    next(err);
  }
};

// update the exports line at the bottom
module.exports = { uploadBill, getUserBills, getBillById, extractBillText };
