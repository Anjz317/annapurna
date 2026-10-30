"use strict";
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { getCurrentProfile } = require("../profileHelpers");

const router = express.Router();
router.use(requireAuth);

const DIET_TYPES = new Set(["vegetarian", "vegan", "eggetarian", "non_vegetarian", "jain"]);
const REGIONS = new Set(["north", "south", "east", "west", "any"]);
const GOALS = new Set(["wellness", "blood_sugar", "heart_health", "weight_loss", "muscle_gain", "hormonal_balance"]);

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get("/", async (req, res) => {
  res.json(await getCurrentProfile(req.userId));
});

// --- Biomarkers ---
router.post("/biomarkers", async (req, res) => {
  const { hba1c, ldl, vitd, tsh, iron } = req.body || {};
  const result = await db.run(
    "INSERT INTO biomarker_readings (user_id, hba1c, ldl, vitd, tsh, iron) VALUES (?,?,?,?,?,?)",
    [req.userId, num(hba1c), num(ldl), num(vitd), num(tsh), num(iron)]
  );
  const row = await db.get("SELECT * FROM biomarker_readings WHERE id = ?", [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.get("/biomarkers/history", async (req, res) => {
  const rows = await db.all("SELECT * FROM biomarker_readings WHERE user_id = ? ORDER BY recorded_at DESC, id DESC", [req.userId]);
  res.json(rows);
});

// --- Goal ---
router.post("/goal", async (req, res) => {
  const { goal } = req.body || {};
  if (!GOALS.has(goal)) {
    return res.status(400).json({ error: "invalid_goal", message: `goal must be one of: ${[...GOALS].join(", ")}` });
  }
  const result = await db.run("INSERT INTO goal_history (user_id, goal) VALUES (?, ?)", [req.userId, goal]);
  const row = await db.get("SELECT * FROM goal_history WHERE id = ?", [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.get("/goal/history", async (req, res) => {
  const rows = await db.all("SELECT * FROM goal_history WHERE user_id = ? ORDER BY started_at DESC, id DESC", [req.userId]);
  res.json(rows);
});

// --- Diet preference ---
router.post("/diet-preference", async (req, res) => {
  const { dietType, regionPreference } = req.body || {};
  if (!DIET_TYPES.has(dietType)) {
    return res.status(400).json({ error: "invalid_diet_type", message: `dietType must be one of: ${[...DIET_TYPES].join(", ")}` });
  }
  if (!REGIONS.has(regionPreference)) {
    return res.status(400).json({ error: "invalid_region", message: `regionPreference must be one of: ${[...REGIONS].join(", ")}` });
  }
  const result = await db.run(
    "INSERT INTO diet_preference_history (user_id, diet_type, region_preference) VALUES (?,?,?)",
    [req.userId, dietType, regionPreference]
  );
  const row = await db.get("SELECT * FROM diet_preference_history WHERE id = ?", [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.get("/diet-preference/history", async (req, res) => {
  const rows = await db.all("SELECT * FROM diet_preference_history WHERE user_id = ? ORDER BY changed_at DESC, id DESC", [req.userId]);
  res.json(rows);
});

module.exports = router;
