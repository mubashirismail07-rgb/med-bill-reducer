// Isolated HTTP integration: no Atlas connection, patient data or Groq calls.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const jwt = require("jsonwebtoken");

test("HTTP upload validation, ownership, review, reports and deletion", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "medreduce-http-"));
  process.env.UPLOAD_DIR = dir;
  process.env.JWT_SECRET = "synthetic-test-secret";
  process.env.GROQ_API_KEY = "";
  process.env.NODE_ENV = "test";
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => {
    if (new URL(String(url)).hostname !== "127.0.0.1")
      throw new Error("External network forbidden in automated tests");
    return realFetch(url, options);
  };
  const Bill = require("../src/models/Bill");
  const User = require("../src/models/User");
  const app = require("../server");
  const original = {
    create: Bill.create,
    findOne: Bill.findOne,
    findById: User.findById,
  };
  let record = null;
  User.findById = (id) => ({
    select: async () => ({ _id: id, name: "Synthetic account" }),
  });
  Bill.create = async (data) =>
    (record = {
      ...data,
      _id: "test-record",
      createdAt: new Date(),
      parsedData: [],
      pages: [],
      extraction: null,
      aiAnalysis: null,
      save: async () => {},
      deleteOne: async () => {
        record = null;
      },
      toObject() {
        const { save, deleteOne, toObject, ...rest } = this;
        return rest;
      },
    });
  Bill.findOne = async (q) =>
    record && q._id === record._id && q.userId === record.userId
      ? record
      : null;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const headers = { Authorization: `Bearer ${token("owner")}` };
  const request = (url, options = {}) =>
    fetch(base + url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
  const form = (bytes, name, type) => {
    const body = new FormData();
    body.append("bill", new Blob([bytes], { type }), name);
    return body;
  };
  try {
    assert.equal((await fetch(base + "/api/bills/test-record")).status, 401);
    const png = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    let response = await request("/api/bills/upload", {
      method: "POST",
      body: form(Buffer.from("invalid"), "fake.pdf", "application/pdf"),
    });
    assert.equal(response.status, 415);
    assert.deepEqual(await fs.readdir(dir), []);
    response = await request("/api/bills/upload", {
      method: "POST",
      body: form(png, "fake.jpg", "image/jpeg"),
    });
    assert.equal(response.status, 415);
    assert.deepEqual(await fs.readdir(dir), []);
    response = await request("/api/bills/upload", {
      method: "POST",
      body: form(png, "synthetic.png", "image/png"),
    });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.equal(data.bill.filePath, undefined);
    assert.equal((await fs.readdir(dir)).length, 1);
    for (const [method, suffix] of [
      ["GET", ""],
      ["POST", "/process"],
      ["PUT", "/review"],
      ["POST", "/analyze"],
      ["DELETE", ""],
    ]) {
      response = await request("/api/bills/test-record" + suffix, {
        method,
        headers: { Authorization: `Bearer ${token("other")}` },
      });
      assert.equal(response.status, 404);
    }
    response = await request("/api/reports/test-record", {
      headers: { Authorization: `Bearer ${token("other")}` },
    });
    assert.equal(response.status, 404);
    response = await request("/api/bills/test-record/original", {
      method: "POST",
      headers: { Authorization: `Bearer ${token("other")}` },
      body: form(png, "replacement.png", "image/png"),
    });
    assert.equal(response.status, 404);
    assert.equal((await fs.readdir(dir)).length, 1);
    // Seed the durable text checkpoint; process must not need the now-missing original.
    await fs.rm(record.filePath);
    record.extractedText = "USD\nConsultation 120.00\nTotal 120.00";
    response = await request("/api/bills/test-record/process", {
      method: "POST",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).bill.processing.stage, "review");
    response = await request("/api/bills/test-record/review", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currency: "USD",
        rows: record.parsedData,
        printedTotal: 120,
        adjustments: [],
      }),
    });
    assert.equal(response.status, 200);
    response = await request("/api/bills/test-record/analyze", {
      method: "POST",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).bill.summary.complete, false);
    response = await request("/api/reports/test-record");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 5)
        .toString(),
      "%PDF-",
    );
    response = await request("/api/bills/test-record", { method: "DELETE" });
    assert.equal(response.status, 200);
    assert.equal(record, null);
    assert.deepEqual(await fs.readdir(dir), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = realFetch;
    Bill.create = original.create;
    Bill.findOne = original.findOne;
    User.findById = original.findById;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
