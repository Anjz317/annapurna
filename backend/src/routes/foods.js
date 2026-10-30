"use strict";
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

async function loadFoodFull(id) {
  const food = await db.get("SELECT * FROM foods WHERE id = ?", [id]);
  if (!food) return null;
  const [tags, ingredients, steps] = await Promise.all([
    db.all("SELECT tag FROM food_tags WHERE food_id = ?", [id]),
    db.all("SELECT ingredient FROM food_ingredients WHERE food_id = ? ORDER BY position", [id]),
    db.all("SELECT step FROM food_steps WHERE food_id = ? ORDER BY position", [id]),
  ]);
  return { ...food, tags: tags.map((t) => t.tag), ingredients: ingredients.map((i) => i.ingredient), steps: steps.map((s) => s.step) };
}

// Public: browse the catalogue.
router.get("/", async (req, res) => {
  const { slot, category, region } = req.query;
  let sql = "SELECT * FROM foods WHERE 1=1";
  const params = [];
  if (slot) { sql += " AND slot = ?"; params.push(slot); }
  if (category) { sql += " AND category = ?"; params.push(category); }
  if (region) { sql += " AND region = ?"; params.push(region); }
  sql += " ORDER BY slot, name";
  const foods = await db.all(sql, params);
  res.json(foods);
});

router.get("/:id", async (req, res) => {
  const food = await loadFoodFull(req.params.id);
  if (!food) return res.status(404).json({ error: "not_found" });
  res.json(food);
});

// Writes require login. No separate admin/role system exists yet -- any
// logged-in user can edit the shared catalogue (acceptable for a
// single-user prototype; revisit before opening this up to more accounts).
router.post("/", requireAuth, async (req, res) => {
  const b = req.body || {};
  const required = ["slug", "name", "slot", "region"];
  for (const field of required) {
    if (!b[field]) return res.status(400).json({ error: "missing_field", field });
  }
  const existing = await db.get("SELECT id FROM foods WHERE slug = ?", [b.slug]);
  if (existing) return res.status(409).json({ error: "slug_taken" });

  const result = await db.run(
    `INSERT INTO foods (slug, name, slot, category, region, wide, has_meat_fish, has_egg, is_vegan, is_jain_safe,
     calories, protein_g, carbs_g, fat_g, prep_time, evidence_note)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [b.slug, b.name, b.slot, b.category || "meal", b.region, b.wide ? 1 : 0, b.hasMeatFish ? 1 : 0, b.hasEgg ? 1 : 0,
     b.isVegan ? 1 : 0, b.isJainSafe ? 1 : 0, b.calories ?? null, b.proteinG ?? null, b.carbsG ?? null, b.fatG ?? null,
     b.prepTime ?? null, b.evidenceNote ?? null]
  );
  const foodId = result.lastInsertRowid;
  for (const tag of b.tags || []) await db.run("INSERT INTO food_tags (food_id, tag) VALUES (?, ?)", [foodId, tag]);
  for (let i = 0; i < (b.ingredients || []).length; i++) await db.run("INSERT INTO food_ingredients (food_id, position, ingredient) VALUES (?,?,?)", [foodId, i, b.ingredients[i]]);
  for (let i = 0; i < (b.steps || []).length; i++) await db.run("INSERT INTO food_steps (food_id, position, step) VALUES (?,?,?)", [foodId, i, b.steps[i]]);

  res.status(201).json(await loadFoodFull(foodId));
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const existing = await db.get("SELECT id FROM foods WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "not_found" });

  const b = req.body || {};
  const current = await db.get("SELECT * FROM foods WHERE id = ?", [id]);
  await db.run(
    `UPDATE foods SET name=?, slot=?, category=?, region=?, wide=?, has_meat_fish=?, has_egg=?, is_vegan=?, is_jain_safe=?,
     calories=?, protein_g=?, carbs_g=?, fat_g=?, prep_time=?, evidence_note=?, updated_at=datetime('now') WHERE id=?`,
    [b.name ?? current.name, b.slot ?? current.slot, b.category ?? current.category, b.region ?? current.region,
     b.wide !== undefined ? (b.wide ? 1 : 0) : current.wide, b.hasMeatFish !== undefined ? (b.hasMeatFish ? 1 : 0) : current.has_meat_fish,
     b.hasEgg !== undefined ? (b.hasEgg ? 1 : 0) : current.has_egg, b.isVegan !== undefined ? (b.isVegan ? 1 : 0) : current.is_vegan,
     b.isJainSafe !== undefined ? (b.isJainSafe ? 1 : 0) : current.is_jain_safe, b.calories ?? current.calories,
     b.proteinG ?? current.protein_g, b.carbsG ?? current.carbs_g, b.fatG ?? current.fat_g, b.prepTime ?? current.prep_time,
     b.evidenceNote ?? current.evidence_note, id]
  );

  if (b.tags) {
    await db.run("DELETE FROM food_tags WHERE food_id = ?", [id]);
    for (const tag of b.tags) await db.run("INSERT INTO food_tags (food_id, tag) VALUES (?, ?)", [id, tag]);
  }
  if (b.ingredients) {
    await db.run("DELETE FROM food_ingredients WHERE food_id = ?", [id]);
    for (let i = 0; i < b.ingredients.length; i++) await db.run("INSERT INTO food_ingredients (food_id, position, ingredient) VALUES (?,?,?)", [id, i, b.ingredients[i]]);
  }
  if (b.steps) {
    await db.run("DELETE FROM food_steps WHERE food_id = ?", [id]);
    for (let i = 0; i < b.steps.length; i++) await db.run("INSERT INTO food_steps (food_id, position, step) VALUES (?,?,?)", [id, i, b.steps[i]]);
  }

  res.json(await loadFoodFull(id));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const existing = await db.get("SELECT id FROM foods WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "not_found" });
  await db.run("DELETE FROM foods WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

module.exports = router;
