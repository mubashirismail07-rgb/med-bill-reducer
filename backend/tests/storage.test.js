const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
test("retention removes expired originals, keeps fresh files and refuses outside paths", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "medreduce-storage-"));
  process.env.UPLOAD_DIR = dir;
  process.env.UPLOAD_RETENTION_HOURS = "1";
  const {
    sweepUploads,
    removeOriginal,
  } = require("../src/services/storageService");
  const old = path.join(dir, "old.png"),
    fresh = path.join(dir, "new.png"),
    outside = path.join(dir, "../outside-" + path.basename(dir));
  try {
    await fs.writeFile(old, "old");
    await fs.writeFile(fresh, "fresh");
    await fs.writeFile(outside, "keep");
    const expired = new Date(Date.now() - 7200000);
    await fs.utimes(old, expired, expired);
    await sweepUploads();
    assert.deepEqual(await fs.readdir(dir), ["new.png"]);
    await removeOriginal(outside);
    assert.equal(await fs.readFile(outside, "utf8"), "keep");
    await removeOriginal(fresh);
    assert.deepEqual(await fs.readdir(dir), []);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(outside, { force: true });
  }
});
