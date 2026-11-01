const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const sharp = require("sharp");
const limits = require("../config/limits");
const error = (message, status = 422) =>
  Object.assign(new Error(message), { status });
let busy = false;
const command = (name, args, timeout) =>
  new Promise((resolve, reject) =>
    execFile(
      name,
      args,
      {
        timeout,
        killSignal: "SIGKILL",
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, OMP_THREAD_LIMIT: "1" },
      },
      (err, stdout) => (err ? reject(err) : resolve(stdout)),
    ),
  );
async function validateFile(file, type) {
  const stat = await fs.stat(file);
  if (stat.size > limits.maxBytes)
    throw error(
      "File exceeds the upload size limit. Split or compress it.",
      413,
    );
  const handle = await fs.open(file, "r");
  const bytes = Buffer.alloc(8);
  try {
    await handle.read(bytes, 0, 8, 0);
  } finally {
    await handle.close();
  }
  const pdf = bytes.subarray(0, 5).toString() === "%PDF-";
  const png = bytes.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "pdf" ? !pdf : !(png || jpg))
    throw error(
      "File contents do not match a supported PDF, JPEG, or PNG.",
      415,
    );
  if (type === "image") {
    try {
      const meta = await sharp(file, { limitInputPixels: 20000000 }).metadata();
      if (!["jpeg", "png"].includes(meta.format) || (meta.pages || 1) > 1)
        throw Error();
    } catch {
      throw error(
        "Image is corrupt, animated, or exceeds 20 megapixels. Export a smaller still image.",
      );
    }
  }
  return pdf ? "application/pdf" : png ? "image/png" : "image/jpeg";
}
async function extractPages(file, type, options = {}) {
  if (busy)
    throw error("Another bill is being read. Please retry in a moment.", 429);
  busy = true;
  let temp;
  const deadline = Date.now() + (options.timeoutMs || limits.timeoutMs);
  const run = async (name, args) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw error(
        "Reading timed out. Split the bill into fewer pages and retry.",
        408,
      );
    return (options.command || command)(name, args, remaining);
  };
  try {
    await validateFile(file, type);
    temp = await fs.mkdtemp(
      path.join(options.tmpRoot || os.tmpdir(), "medreduce-"),
    );
    const ocr = async (image) => {
      const prepared = path.join(temp, "prepared.png");
      await sharp(image, { limitInputPixels: 20000000 })
        .rotate()
        .resize({
          width: 2000,
          height: 2600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .greyscale()
        .normalize()
        .png()
        .toFile(prepared);
      try {
        return await run("tesseract", [
          prepared,
          "stdout",
          "-l",
          "eng",
          "--psm",
          "3",
        ]);
      } finally {
        await fs.rm(prepared, { force: true });
      }
    };
    if (type === "image") {
      const text = await ocr(file);
      return [
        {
          page: 1,
          method: "ocr",
          text,
          warning: text.trim()
            ? null
            : "No readable text. Check this image manually.",
        },
      ];
    }
    const info = await run("pdfinfo", [file]);
    if (/Encrypted:\s+yes/i.test(info))
      throw error("Encrypted PDFs are not supported. Export an unlocked copy.");
    const count = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
    if (!count) throw error("Cannot read PDF pages. Export a fresh PDF.");
    if (count > limits.maxPages)
      throw error(
        `PDF has ${count} pages; the limit is ${limits.maxPages}. Split the document.`,
        413,
      );
    const pages = [];
    for (let page = 1; page <= count; page++) {
      let text = await run("pdftotext", [
        "-f",
        String(page),
        "-l",
        String(page),
        "-layout",
        file,
        "-",
      ]);
      // Inspect raster content too: text headers must not hide scanned charges on the same page.
      const images = await run("pdfimages", [
        "-f",
        String(page),
        "-l",
        String(page),
        "-list",
        file,
      ]);
      const hasRaster = images
        .split("\n")
        .some((line) =>
          /^\s*\d+\s+\d+\s+image\s+([0-9]+)\s+([0-9]+)/.test(line),
        );
      let method = "text";
      if (text.replace(/\s/g, "").length < 30 || hasRaster) {
        const prefix = path.join(temp, "page");
        await run("pdftoppm", [
          "-f",
          String(page),
          "-l",
          String(page),
          "-singlefile",
          "-scale-to",
          "2200",
          "-png",
          file,
          prefix,
        ]);
        text = await ocr(prefix + ".png");
        method = "ocr";
        await fs.rm(prefix + ".png", { force: true });
      }
      pages.push({
        page,
        method,
        text,
        warning: text.trim()
          ? null
          : "No readable text. Check this page manually.",
      });
    }
    return pages;
  } catch (err) {
    if (err.status) throw err;
    if (err.code === "ENOENT")
      throw error(
        "Original file or required PDF/OCR tool is unavailable. Reattach the original or contact the administrator.",
        410,
      );
    if (err.killed)
      throw error(
        "Reading timed out. Split the bill into fewer pages and retry.",
        408,
      );
    throw error(
      "Unable to read this file. It may be corrupt or password protected. Export an unlocked PDF or clear image.",
    );
  } finally {
    try {
      if (temp) await fs.rm(temp, { recursive: true, force: true });
    } finally {
      busy = false;
    }
  }
}
module.exports = {
  validateFile,
  extractPages,
  extractTextFromFile: async (file, type) =>
    (await extractPages(file, type))
      .map((p) => `--- Page ${p.page} ---\n${p.text}`)
      .join("\n"),
};
