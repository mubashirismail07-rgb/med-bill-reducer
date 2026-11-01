const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const PDF = require("pdfkit");
const sharp = require("sharp");
const { extractPages, validateFile } = require("../src/services/ocrService");
const limits = require("../src/config/limits");
async function fixture(dir, name, draw, options = {}) {
  const file = path.join(dir, name);
  const doc = new PDF({ margin: 50, ...options });
  const chunks = [];
  doc.on("data", (d) => chunks.push(d));
  const done = new Promise((r) => doc.on("end", r));
  draw(doc);
  doc.end();
  await done;
  await fs.writeFile(file, Buffer.concat(chunks));
  return file;
}
async function temp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bill-test-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
const toolsAvailable = (() => {
  try {
    execFileSync("pdfinfo", ["-v"], { stdio: "ignore" });
    execFileSync("tesseract", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
async function image(dir) {
  const file = path.join(dir, "scan.png");
  await sharp(
    Buffer.from(
      '<svg width="1200" height="600"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="sans-serif" font-size="45"><text x="80" y="100">FICTIONAL BILL USD</text><text x="80" y="220">Consultation 120.00</text><text x="80" y="320">Blood test 45.00</text><text x="80" y="420">Total 165.00</text></g></svg>',
    ),
  )
    .png()
    .toFile(file);
  return file;
}
test(
  "real text PDF preserves every page and embedded text",
  { skip: !toolsAvailable },
  () =>
    temp(async (dir) => {
      const file = await fixture(dir, "text.pdf", (d) => {
        d.text("FICTIONAL BILL USD\nConsultation 120.00\nTotal 120.00");
        d.addPage().text("FICTIONAL BILL USD\nBlood test 45.00\nTotal 45.00");
      });
      const pages = await extractPages(file, "pdf", { tmpRoot: dir });
      assert.equal(pages.length, 2);
      assert.ok(pages.every((p) => p.method === "text"));
      assert.match(pages[1].text, /45.00/);
      assert.ok(
        !(await fs.readdir(dir)).some((n) => n.startsWith("medreduce-")),
      );
    }),
);
test(
  "real PNG and JPEG OCR works and cleans preprocessing files",
  { skip: !toolsAvailable },
  () =>
    temp(async (dir) => {
      const png = await image(dir);
      const jpeg = path.join(dir, "scan.jpg");
      await sharp(png).jpeg().toFile(jpeg);
      for (const file of [png, jpeg]) {
        const pages = await extractPages(file, "image", { tmpRoot: dir });
        assert.match(pages[0].text, /Consultation/);
        assert.match(pages[0].text, /120/);
      }
      assert.ok(
        !(await fs.readdir(dir)).some((n) => n.startsWith("medreduce-")),
      );
    }),
);
test(
  "scanned, mixed-page and mixed-document PDFs do not skip scanned charges",
  { skip: !toolsAvailable },
  () =>
    temp(async (dir) => {
      const scan = await image(dir);
      const file = await fixture(dir, "mixed.pdf", (d) => {
        d.text("FICTIONAL BILL USD\nText service 100.00\nTotal 100.00");
        d.addPage().image(scan, 50, 100, { width: 490 });
        d.addPage()
          .text("Embedded text header that must not suppress scanned charges")
          .image(scan, 50, 150, { width: 490 });
      });
      const pages = await extractPages(file, "pdf", { tmpRoot: dir });
      assert.deepEqual(
        pages.map((p) => p.method),
        ["text", "ocr", "ocr"],
      );
      assert.match(pages[1].text, /Consultation/);
      assert.match(pages[2].text, /Consultation/);
    }),
);
test("invalid signature and configured size limit rejected", () =>
  temp(async (dir) => {
    const file = path.join(dir, "fake.pdf");
    await fs.writeFile(file, "not a pdf");
    await assert.rejects(() => validateFile(file, "pdf"), /contents/);
    const handle = await fs.open(file, "w");
    await handle.truncate(limits.maxBytes + 1);
    await handle.close();
    await assert.rejects(() => validateFile(file, "pdf"), /size limit/);
  }));
test(
  "page limits, encrypted PDFs and corrupt PDFs have actionable errors",
  { skip: !toolsAvailable },
  () =>
    temp(async (dir) => {
      const many = await fixture(dir, "many.pdf", (d) => {
        for (let i = 0; i < limits.maxPages + 1; i++) {
          if (i) d.addPage();
          d.text("Example");
        }
      });
      await assert.rejects(
        () => extractPages(many, "pdf", { tmpRoot: dir }),
        /limit/,
      );
      const locked = await fixture(
        dir,
        "locked.pdf",
        (d) => d.text("Secret sample"),
        { userPassword: "synthetic" },
      );
      await assert.rejects(
        () => extractPages(locked, "pdf", { tmpRoot: dir }),
        /password|Encrypted/i,
      );
      const bad = path.join(dir, "bad.pdf");
      await fs.writeFile(bad, "%PDF-corrupt");
      await assert.rejects(
        () => extractPages(bad, "pdf", { tmpRoot: dir }),
        /corrupt/,
      );
      assert.ok(
        !(await fs.readdir(dir)).some((n) => n.startsWith("medreduce-")),
      );
    }),
);
test("timeout and command failure clean up; OCR work is bounded", () =>
  temp(async (dir) => {
    const file = await fixture(dir, "a.pdf", (d) => d.text("Text"));
    let release;
    const waiting = new Promise((r) => (release = r));
    const work = extractPages(file, "pdf", {
      tmpRoot: dir,
      command: async () => {
        await waiting;
        throw Object.assign(new Error("timeout"), { killed: true });
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    await assert.rejects(() => extractPages(file, "pdf"), /Another bill/);
    release();
    await assert.rejects(() => work, /timed out/);
    assert.ok(!(await fs.readdir(dir)).some((n) => n.startsWith("medreduce-")));
  }));

test("missing PDF/OCR executable reports a deployment problem", () =>
  temp(async (dir) => {
    const file = await fixture(dir, "a.pdf", (d) => d.text("Text"));
    await assert.rejects(
      () =>
        extractPages(file, "pdf", {
          tmpRoot: dir,
          command: async (name) => {
            throw Object.assign(new Error(`${name} not found`), {
              code: "ENOENT",
              tool: name,
            });
          },
        }),
      /Required PDF\/OCR tool "pdfinfo" is not installed/,
    );
  }));
