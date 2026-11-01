const notFound = (_req, res, next) =>
  next(Object.assign(new Error("Route not found"), { status: 404 }));
const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  let status = err.status || 500,
    message = err.message;
  if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "File exceeds the configured size limit. Compress or split it.";
  }
  if (err.name === "MulterError" && status === 500) status = 400;
  if (err.name === "CastError") {
    status = 404;
    message = "Resource not found";
  }
  if (status === 500)
    message = "The server could not finish this request. Please retry.";
  res.status(status).json({ message });
};
module.exports = { notFound, errorHandler };
