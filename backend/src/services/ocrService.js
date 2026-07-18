const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const preprocessImage = async (filePath) => {
  const outputPath = filePath.replace(/\.(png|jpg|jpeg)$/i, "_processed.png");
  await sharp(filePath)
    .greyscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(outputPath);
  return outputPath;
};

const extractFromImage = async (filePath) => {
  let processedPath = null;
  try {
    processedPath = await preprocessImage(filePath);
    const { data: { text } } = await Tesseract.recognize(processedPath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.log("\nOCR complete.");
    return text;
  } finally {
    if (processedPath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
  }
};

const extractTextFromFile = async (filePath, fileType) => {
  if (fileType === "image") {
    return await extractFromImage(filePath);
  } else if (fileType === "pdf") {
    throw new Error("PDF OCR is not supported in production. Please upload a PNG or JPG image of your bill.");
  } else {
    throw new Error("Unsupported file type");
  }
};

module.exports = { extractTextFromFile };