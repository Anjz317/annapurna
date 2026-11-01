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

// The frontend and API are served from the same Vercel deployment (same
// origin), so the browser never actually applies CORS to that traffic --
// the real access-control boundary for the auth cookie is its own
// `sameSite: "lax"` + `httpOnly` setting, not this header. Reflecting
// whatever Origin was sent (rather than matching a maintained allowlist)
// avoids a brittle mismatch rejecting legitimate same-origin calls across
// Vercel's preview-URL-per-deployment domains.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/foods", foodsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/sample", sampleRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Local dev convenience only: serve the frontend from this same process.
// On Vercel, backend/public/* is served as a static file by the platform
// itself (see vercel.json's rewrites for /app and /app.html), not by this
// middleware -- VERCEL is set in every Vercel function's environment.
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, "..", "public")));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "server_error", message: err.message });
});

module.exports = app;
