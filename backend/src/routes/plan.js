"use strict";
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const { getCurrentProfile } = require("../profileHelpers");
const ruleEngine = require("../ruleEngine");

const router = express.Router();
router.use(requireAuth);

async function foodsById(ids) {
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => "?").join(",");
  const foods = await db.all(`SELECT * FROM foods WHERE id IN (${placeholders})`, ids);
  const tagRows = await db.all(`SELECT * FROM food_tags WHERE food_id IN (${placeholders})`, ids);
  const ingRows = await db.all(`SELECT * FROM food_ingredients WHERE food_id IN (${placeholders}) ORDER BY position`, ids);
  const stepRows = await db.all(`SELECT * FROM food_steps WHERE food_id IN (${placeholders}) ORDER BY position`, ids);
  const byId = {};
  for (const f of foods) byId[f.id] = { ...f, tags: [], ingredients: [], steps: [] };
  for (const r of tagRows) if (byId[r.food_id]) byId[r.food_id].tags.push(r.tag);
  for (const r of ingRows) if (byId[r.food_id]) byId[r.food_id].ingredients.push(r.ingredient);
  for (const r of stepRows) if (byId[r.food_id]) byId[r.food_id].steps.push(r.step);
  return byId;
}

// Reassembles a persisted generated_plans row (+ its plan_meals) into the
// same { weeks: [...] } shape generatePlan() produces, with full food
// details joined in instead of bare ids.
async function loadPersistedPlan(plan) {
  const meals = await db.all("SELECT * FROM plan_meals WHERE plan_id = ? ORDER BY day_index, id", [plan.id]);
  const foodIds = [...new Set(meals.map((m) => m.food_id))];
  const byId = await foodsById(foodIds);

  const dayCount = meals.length ? Math.max(...meals.map((m) => m.day_index)) + 1 : 0;
  const weeks = [];
  for (let w = 0; w < Math.ceil(dayCount / 7); w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dayIndex = w * 7 + d;
      const dayMeals = meals.filter((m) => m.day_index === dayIndex);
      const mealsBySlot = {};
      const seenSlot = {};
      for (const m of dayMeals) {
        const key = seenSlot[m.slot] ? `${m.slot}#2` : m.slot; // 2nd same-named slot (muscle-gain extra snack)
        seenSlot[m.slot] = true;
        mealsBySlot[key] = byId[m.food_id];
      }
      week.push({ dayIndex, meals: mealsBySlot });
    }
    weeks.push(week);
  }
  return { planId: plan.id, planLength: plan.plan_length, generatedAt: plan.generated_at, weeks };
}

router.get("/", async (req, res) => {
  const planLength = req.query.length === "monthly" ? "monthly" : "weekly";
  const force = req.query.regenerate === "true";
  const { biomarkers, goal, dietPreference } = await getCurrentProfile(req.userId);

  if (!goal || !dietPreference) {
    return res.status(400).json({
      error: "profile_incomplete",
      message: "Set your diet preference and goal before generating a plan.",
      missing: { biomarkers: !biomarkers, goal: !goal, dietPreference: !dietPreference },
    });
  }

  // Reuse the latest plan if nothing that would change it has changed.
  if (!force) {
    const latest = await db.get(
      `SELECT * FROM generated_plans WHERE user_id = ? AND plan_length = ?
       ORDER BY generated_at DESC, id DESC LIMIT 1`,
      [req.userId, planLength]
    );
    if (
      latest &&
      latest.goal_history_id === goal.id &&
      latest.diet_preference_id === dietPreference.id &&
      (latest.biomarker_reading_id || null) === (biomarkers ? biomarkers.id : null)
    ) {
      const payload = await loadPersistedPlan(latest);
      return res.json({ ...payload, reused: true, profile: { diet: dietPreference.diet_type, region: dietPreference.region_preference, goal: goal.goal } });
    }
  }

  const bio = biomarkers || { hba1c: null, ldl: null, vitd: null, tsh: null, iron: null };
  const flags = ruleEngine.deriveFlags(bio);
  const profile = { diet: dietPreference.diet_type, region: dietPreference.region_preference, goal: goal.goal, flags, planLength };

  const result = await ruleEngine.generatePlan(profile);

  const planRow = await db.run(
    "INSERT INTO generated_plans (user_id, plan_length, biomarker_reading_id, goal_history_id, diet_preference_id) VALUES (?,?,?,?,?)",
    [req.userId, planLength, biomarkers ? biomarkers.id : null, goal.id, dietPreference.id]
  );
  const planId = planRow.lastInsertRowid;

  for (const week of result.weeks) {
    for (const day of week) {
      for (const [slotKey, food] of Object.entries(day.meals)) {
        const slot = slotKey.includes("#") ? slotKey.split("#")[0] : slotKey;
        await db.run("INSERT INTO plan_meals (plan_id, day_index, slot, food_id) VALUES (?,?,?,?)", [planId, day.dayIndex, slot, food.id]);
      }
    }
  }

  res.status(201).json({
    planId,
    planLength,
    reused: false,
    profile: { diet: profile.diet, region: profile.region, goal: profile.goal, flags: profile.flags },
    rationale: result.rationale,
    recommendedDrinks: result.recommendedDrinks.map((d) => ({
      id: d.id, name: d.name, calories: d.calories, protein_g: d.protein_g, evidenceNote: d.evidence_note,
    })),
    weeks: result.weeks,
  });
});

router.get("/latest", async (req, res) => {
  const plan = await db.get("SELECT * FROM generated_plans WHERE user_id = ? ORDER BY generated_at DESC, id DESC LIMIT 1", [req.userId]);
  if (!plan) return res.status(404).json({ error: "no_plan_yet" });
  res.json(await loadPersistedPlan(plan));
});

module.exports = router;
