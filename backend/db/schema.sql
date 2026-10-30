-- Annapurna backend schema
-- Works as-is against local SQLite (dev) and Turso/libSQL (prod) -- both speak this dialect.

-- ===== Accounts =====

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Versioned profile data =====
-- Each of these is append-only: a new row per change. The latest row per
-- user (by recorded_at/started_at/changed_at) is the "current" value. This
-- is what lets biomarkers and goals change over time without losing history,
-- and lets a generated plan record exactly which profile state produced it.

CREATE TABLE IF NOT EXISTS biomarker_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hba1c REAL,
  ldl REAL,
  vitd REAL,
  tsh REAL,
  iron REAL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_biomarker_readings_user ON biomarker_readings(user_id, recorded_at);

CREATE TABLE IF NOT EXISTS goal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL, -- wellness | blood_sugar | heart_health | weight_loss | muscle_gain | hormonal_balance
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_goal_history_user ON goal_history(user_id, started_at);

CREATE TABLE IF NOT EXISTS diet_preference_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diet_type TEXT NOT NULL,        -- vegetarian | vegan | eggetarian | non_vegetarian | jain
  region_preference TEXT NOT NULL, -- north | south | east | west | any
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diet_pref_history_user ON diet_preference_history(user_id, changed_at);

-- ===== Food catalogue =====
-- Recipes AND functional drinks live here (category distinguishes them).
-- Editable/extensible via the foods CRUD endpoints -- nothing hardcoded in app code.

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,         -- e.g. "moong-dal-chilla", stable reference for seed/plan data
  name TEXT NOT NULL,
  slot TEXT NOT NULL,                -- breakfast | lunch | snack | dinner | protein_snack | drink
  category TEXT NOT NULL DEFAULT 'meal', -- meal | drink
  region TEXT NOT NULL,              -- north | south | east | west
  wide INTEGER NOT NULL DEFAULT 0,   -- 1 = genuinely eaten pan-India, usable as cross-region filler
  has_meat_fish INTEGER NOT NULL DEFAULT 0,
  has_egg INTEGER NOT NULL DEFAULT 0,
  is_vegan INTEGER NOT NULL DEFAULT 0,
  is_jain_safe INTEGER NOT NULL DEFAULT 0,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  prep_time TEXT,
  evidence_note TEXT,                -- drinks only: the real evidence behind the recommendation, shown to the user
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_foods_slot ON foods(slot);
CREATE INDEX IF NOT EXISTS idx_foods_region ON foods(region);

CREATE TABLE IF NOT EXISTS food_tags (
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  tag TEXT NOT NULL, -- low_gi | high_fiber | high_protein | iron_rich | vitd_rich | low_fat | weight_loss_friendly | muscle_gain_friendly
  PRIMARY KEY (food_id, tag)
);

CREATE TABLE IF NOT EXISTS food_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  ingredient TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_food_ingredients_food ON food_ingredients(food_id, position);

CREATE TABLE IF NOT EXISTS food_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  step TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_food_steps_food ON food_steps(food_id, position);

-- ===== Generated plans =====

CREATE TABLE IF NOT EXISTS generated_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_length TEXT NOT NULL, -- weekly | monthly
  biomarker_reading_id INTEGER REFERENCES biomarker_readings(id),
  goal_history_id INTEGER REFERENCES goal_history(id),
  diet_preference_id INTEGER REFERENCES diet_preference_history(id),
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_generated_plans_user ON generated_plans(user_id, generated_at);

CREATE TABLE IF NOT EXISTS plan_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES generated_plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL, -- 0-based, continuous across weeks for monthly plans
  slot TEXT NOT NULL,
  food_id INTEGER NOT NULL REFERENCES foods(id)
);
CREATE INDEX IF NOT EXISTS idx_plan_meals_plan ON plan_meals(plan_id, day_index);

-- ===== Feedback =====
-- Deliberately simple: one free-text field, who gave it, and when.

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id, submitted_at);
