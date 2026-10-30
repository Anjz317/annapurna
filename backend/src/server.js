"use strict";
require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const planRoutes = require("./routes/plan");
const foodsRoutes = require("./routes/foods");
const feedbackRoutes = require("./routes/feedback");
const sampleRoutes = require("./routes/sample");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Same-origin requests (no Origin header, e.g. curl, or the app served
    // from this same server) are always allowed; cross-origin only from the
    // configured list.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/foods", foodsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/sample", sampleRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// The account-based frontend. The original static demo (repo root
// index.html) is untouched and deployed separately.
app.use(express.static(path.join(__dirname, "..", "public")));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "server_error", message: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Annapurna backend listening on http://localhost:${PORT}`);
});
