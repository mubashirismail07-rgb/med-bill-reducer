const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "image"],
      required: true,
    },
    currency: { type: String, default: null },
    extraction: { type: Object, default: null },
    pages: { type: Array, default: [] },
    processing: { type: Object, default: null },
    reviewedAt: { type: Date, default: null },
    originalExpiresAt: { type: Date, default: null },
    revision: { type: Number, default: 0 },
    extractedText: {
      type: String,
      default: null,
    },
    parsedData: {
      type: Array,
      default: [],
    },
    aiAnalysis: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bill", billSchema);
