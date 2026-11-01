if (require.main === module) require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const origins = (
  process.env.FRONTEND_URLS ||
  "http://localhost:5173,https://med-bill-reducer.vercel.app"
)
  .split(",")
  .map((s) => s.trim());
app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "512kb" }));
app.get("/", (_req, res) =>
  res.json({ message: "MedReduce API", status: "ok" }),
);
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/bills", require("./src/routes/billRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));
const { notFound, errorHandler } = require("./src/middleware/errorMiddleware");
app.use(notFound);
app.use(errorHandler);
if (require.main === module) {
  require("./src/config/db")().then(() => {
    const { sweepUploads } = require("./src/services/storageService");
    sweepUploads().catch(() => console.error("Upload cleanup failed"));
    setInterval(
      () => sweepUploads().catch(() => console.error("Upload cleanup failed")),
      3600000,
    ).unref();
    app.listen(process.env.PORT || 5000, "0.0.0.0", () =>
      console.log("MedReduce API listening"),
    );
  });
}
module.exports = app;
