const positive = (key, fallback) => {
  const n = Number(process.env[key] || fallback);
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid ${key}`);
  return n;
};
module.exports = {
  maxBytes: positive("MAX_UPLOAD_MB", 5) * 1024 * 1024,
  maxPages: positive("MAX_PDF_PAGES", 5),
  timeoutMs: positive("PROCESSING_TIMEOUT_MS", 120000),
  retentionMs: positive("UPLOAD_RETENTION_HOURS", 24) * 3600000,
};
