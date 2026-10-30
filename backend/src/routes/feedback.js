"use strict";
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { latestGoal } = require("../profileHelpers");

const router = express.Router();
router.use(requireAuth);

const CHECKIN_INTERVAL_DAYS = 30;

router.post("/", async (req, res) => {
  const { feedbackText } = req.body || {};
  if (typeof feedbackText !== "string" || !feedbackText.trim()) {
    return res.status(400).json({ error: "empty_feedback", message: "Feedback text is required to submit (the check-in itself is optional)." });
  }
  const result = await db.run("INSERT INTO feedback (user_id, feedback_text) VALUES (?, ?)", [req.userId, feedbackText.trim()]);
  const row = await db.get("SELECT * FROM feedback WHERE id = ?", [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.get("/", async (req, res) => {
  const rows = await db.all("SELECT * FROM feedback WHERE user_id = ? ORDER BY submitted_at DESC, id DESC", [req.userId]);
  res.json(rows);
});

router.get("/due", async (req, res) => {
  const user = await db.get("SELECT created_at FROM users WHERE id = ?", [req.userId]);
  const lastFeedback = await db.get("SELECT submitted_at FROM feedback WHERE user_id = ? ORDER BY submitted_at DESC, id DESC LIMIT 1", [req.userId]);
  const goal = await latestGoal(req.userId);

  // The later of: last feedback given, current goal started, account created.
  // SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" (UTC, space-separated,
  // no offset) -- normalize to ISO 8601 before parsing so this is read as UTC
  // consistently across JS engines, not accidentally as local time.
  const toUtcMs = (d) => new Date(d.replace(" ", "T") + "Z").getTime();
  const candidates = [user.created_at, goal ? goal.started_at : null, lastFeedback ? lastFeedback.submitted_at : null].filter(Boolean);
  const lastRef = candidates.map(toUtcMs).reduce((a, b) => Math.max(a, b), 0);
  const daysSince = (Date.now() - lastRef) / (1000 * 60 * 60 * 24);

  res.json({ due: daysSince >= CHECKIN_INTERVAL_DAYS, daysSinceLastCheckIn: Math.floor(daysSince), intervalDays: CHECKIN_INTERVAL_DAYS });
});

module.exports = router;
