const fs = require("fs/promises");
const path = require("path");
const { uploadDir } = require("../config/multer");
const { retentionMs } = require("../config/limits");
async function removeOriginal(file) {
  if (file && path.dirname(path.resolve(file)) === uploadDir)
    await fs.rm(file, { force: true });
}
async function sweepUploads() {
  const now = Date.now();
  for (const name of await fs.readdir(uploadDir)) {
    const file = path.join(uploadDir, name);
    const stat = await fs.stat(file);
    if (stat.isFile() && now - stat.mtimeMs > retentionMs)
      await fs.rm(file, { force: true });
  }
}
module.exports = { removeOriginal, sweepUploads };
