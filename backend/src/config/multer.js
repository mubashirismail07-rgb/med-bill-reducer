const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { maxBytes } = require("./limits");
const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads"),
);
fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
const types = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
module.exports = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) =>
      cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const valid =
      types[path.extname(file.originalname).toLowerCase()] === file.mimetype;
    cb(
      valid
        ? null
        : Object.assign(
            new Error(
              "Choose a JPEG, PNG, or PDF with its matching file extension.",
            ),
            { status: 415 },
          ),
      valid,
    );
  },
});
module.exports.uploadDir = uploadDir;
