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
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);