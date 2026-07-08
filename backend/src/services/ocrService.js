const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const sharp = require("sharp");


const extractFromImage = async (filePath) => {
  const { data: { text } } = await Tesseract.recognize(filePath, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  console.log("\nOCR complete.");
  return text;
};

const extractFromPDF = async (filePath) => {
  const pdfPoppler = require("pdf-poppler");

  const outputDir = path.join(path.dirname(filePath), "pdf_pages");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const opts = {
    format: "png",
    out_dir: outputDir,
    out_prefix: path.basename(filePath, ".pdf"),
    page: null, // all pages
  };

  await pdfPoppler.convert(filePath, opts);

  const imageFiles = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(outputDir, f));

  if (imageFiles.length === 0) {
    throw new Error("PDF conversion produced no images");
  }

  let fullText = "";
  for (const imgPath of imageFiles) {
    const pageText = await extractFromImage(imgPath);
    fullText += pageText + "\n";
  }

  // Cleanup temp page images
  fs.rmSync(outputDir, { recursive: true, force: true });

  return fullText.trim();
};

// Main export — auto-detects file type
const extractTextFromFile = async (filePath, fileType) => {
  if (fileType === "image") {
    return await extractFromImage(filePath);
  } else if (fileType === "pdf") {
    return await extractFromPDF(filePath);
  } else {
    throw new Error("Unsupported file type for OCR");
  }
};

module.exports = { extractTextFromFile };