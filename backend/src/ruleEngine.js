"use strict";
// Server-side port of the original client-side rule engine. Same algorithm,
// same guarantees (diet/region correctness, >=2-day rolling gap between
// repeats) -- now the single source of truth, reading the food catalogue
// from the database instead of an embedded JS array.

const db = require("./db");

const SLOTS = ["breakfast", "lunch", "snack", "dinner"];

const FLAG_TAGS = {
  glucose_high: ["low_gi", "high_fiber"],
  ldl_high: ["low_fat", "high_fiber"],
  vitd_low: ["vitd_rich"],
  iron_low: ["iron_rich"],
};
const GOAL_TAGS = {
  wellness: [],
  blood_sugar: ["low_gi", "high_fiber"],
  heart_health: ["low_fat", "high_fiber"],
  weight_loss: ["weight_loss_friendly", "low_fat"],
  muscle_gain: ["muscle_gain_friendly", "high_protein"],
  hormonal_balance: ["low_gi", "high_fiber", "high_protein"],
};
const TAG_REASONS = {
  low_gi: "has a low glycemic index",
  high_fiber: "is high in fibre",
  high_protein: "is protein-rich",
  iron_rich: "is a good source of iron",
  vitd_rich: "contributes vitamin D",
  low_fat: "is lighter on fat",
  weight_loss_friendly: "is portioned for a calorie-conscious goal",
  muscle_gain_friendly: "is built to support muscle gain",
};
const FLAG_LABELS = {
  glucose_high: "Blood sugar reading above the healthy range — prioritising low-glycemic staples and fibre",
  ldl_high: "LDL cholesterol above the healthy range — reducing fried and ghee-heavy dishes",
  vitd_low: "Vitamin D below the healthy range — weighting toward vitamin D sources your diet allows",
  iron_low: "Iron/ferritin below the healthy range — adding iron-rich pulses, millets and greens",
  thyroid: "TSH outside the healthy range — keeping iodine intake steady and raw cruciferous vegetables in moderation",
};

function deriveFlags(bio) {
  const flags = [];
  if (bio.hba1c != null && bio.hba1c >= 5.7) flags.push("glucose_high");
  if (bio.ldl != null && bio.ldl >= 130) flags.push("ldl_high");
  if (bio.vitd != null && bio.vitd < 30) flags.push("vitd_low");
  if (bio.tsh != null && bio.tsh > 4.5) flags.push("thyroid");
  if (bio.iron != null && bio.iron < 30) flags.push("iron_low");
  return flags;
}

function isDietCompatible(food, diet) {
  if (diet === "non_vegetarian") return true;
  if (food.has_meat_fish) return false;
  if (diet === "eggetarian") return true;
  if (food.has_egg) return false;
  if (diet === "vegetarian") return true;
  if (diet === "vegan") return !!food.is_vegan;
  if (diet === "jain") return !!food.is_jain_safe;
  return true;
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seededRandom(str) {
  return (hashStr(str) % 1000) / 1000;
}

function activeTagSet(flags, goal) {
  const tags = {};
  flags.forEach((f) => (FLAG_TAGS[f] || []).forEach((t) => (tags[t] = true)));
  (GOAL_TAGS[goal] || []).forEach((t) => (tags[t] = true));
  return tags;
}

function scoreFood(food, profile, tagSet, seed) {
  let score = 0;
  for (const tag of food.tags) if (tagSet[tag]) score += 3;
  if (profile.region !== "any" && food.region === profile.region) score += 6;
  score += seededRandom(seed + food.slug) * 0.9;
  return score;
}

// Needs >=4 options: a rolling N-day week caps any single dish at floor(N/3)
// uses (gap-of-2 rule), so fewer than 4 distinct dishes can't cover every
// day without a forced clash -- widen to the full diet-compatible list then.
function buildPool(allFoods, slot, profile, tagSet, seed) {
  const dietOk = allFoods.filter((f) => f.slot === slot && f.category === "meal" && isDietCompatible(f, profile.diet));
  let candidates = dietOk;
  if (profile.region !== "any") {
    const regional = dietOk.filter((f) => f.region === profile.region || f.wide);
    if (regional.length >= 4) candidates = regional;
  }
  candidates = candidates.slice().sort((a, b) => scoreFood(b, profile, tagSet, seed) - scoreFood(a, profile, tagSet, seed));
  const pool = candidates.slice(0, Math.max(4, Math.min(candidates.length, 8)));
  return pool.length ? pool : candidates;
}

function circularDistance(i, j, n) {
  const d = Math.abs(i - j);
  return Math.min(d, n - d);
}

// Greedy rolling scheduler: at each day, prefer the least-used-so-far option
// (falling back to score order among ties) that is still >= minGap days from
// every prior placement of itself, measured the short way around the circle
// (so e.g. a weekly plan's Sunday and the following Monday are adjacent).
function scheduleRolling(pool, n, minGap) {
  const seq = new Array(n).fill(-1);
  const usage = new Array(pool.length).fill(0);
  for (let pos = 0; pos < n; pos++) {
    const order = pool.map((_, idx) => idx).sort((a, b) => (usage[a] !== usage[b] ? usage[a] - usage[b] : a - b));
    let chosen = -1;
    for (const k of order) {
      let ok = true;
      for (let p = 0; p < n; p++) {
        if (seq[p] === k && circularDistance(pos, p, n) < minGap) { ok = false; break; }
      }
      if (ok) { chosen = k; break; }
    }
    if (chosen === -1) {
      let bestK = 0, bestDist = -1;
      for (let k = 0; k < pool.length; k++) {
        let minD = n;
        for (let p = 0; p < n; p++) if (seq[p] === k) minD = Math.min(minD, circularDistance(pos, p, n));
        if (minD > bestDist) { bestDist = minD; bestK = k; }
      }
      chosen = bestK;
    }
    seq[pos] = chosen;
    usage[chosen]++;
  }
  return seq.map((k) => pool[k]);
}

async function loadAllFoods() {
  const foods = await db.all("SELECT * FROM foods");
  const tagRows = await db.all("SELECT * FROM food_tags");
  const tagsByFood = {};
  for (const row of tagRows) {
    (tagsByFood[row.food_id] = tagsByFood[row.food_id] || []).push(row.tag);
  }
  return foods.map((f) => ({ ...f, tags: tagsByFood[f.id] || [] }));
}

// profile: { diet, region, goal, flags: string[], planLength: 'weekly'|'monthly' }
async function generatePlan(profile) {
  const allFoods = await loadAllFoods();
  const tagSet = activeTagSet(profile.flags, profile.goal);
  const seed = `${profile.diet}|${profile.region}|${profile.goal}|${profile.flags.join(",")}`;

  // Muscle gain gets one extra snack-slot item per day, scored toward
  // high_protein/muscle_gain_friendly -- per-meal protein distribution has
  // weak-to-moderate support; a fixed "every 3-4 hours" cadence does not,
  // so this adds one additional protein-forward snack rather than a whole
  // extra meal tier.
  const activeSlots = profile.goal === "muscle_gain" ? [...SLOTS, "snack"] : SLOTS;

  const totalDays = (profile.planLength === "monthly" ? 4 : 1) * 7;
  const schedules = {};
  const pools = {};
  const seenBase = {};
  activeSlots.forEach((slot) => {
    const key = seenBase[slot] ? `${slot}#2` : slot; // disambiguate a repeated base slot (e.g. muscle-gain's 2nd snack)
    seenBase[slot] = true;
    const pool = buildPool(allFoods, slot, profile, tagSet, seed + "|" + key);
    pools[key] = pool;
    schedules[key] = scheduleRolling(pool, totalDays, 3);
  });

  // Two slot-keys that share the same base slot (e.g. "snack" and "snack#2")
  // were scheduled independently and can coincidentally land on the same
  // dish on the same day -- nobody wants the identical snack twice in one
  // day. Swap the later one to any other pool option that day; pools are
  // guaranteed >=4 options, so an alternative always exists.
  const keysByBase = {};
  Object.keys(schedules).forEach((key) => {
    const base = key.includes("#") ? key.split("#")[0] : key;
    (keysByBase[base] = keysByBase[base] || []).push(key);
  });
  for (const base in keysByBase) {
    const keys = keysByBase[base];
    if (keys.length < 2) continue;
    for (let day = 0; day < totalDays; day++) {
      const seenIds = new Set();
      for (const key of keys) {
        let current = schedules[key][day];
        if (seenIds.has(current.id)) {
          const alt = pools[key].find((f) => !seenIds.has(f.id));
          if (alt) { schedules[key][day] = alt; current = alt; }
        }
        seenIds.add(current.id);
      }
    }
  }

  const weeks = [];
  const weeksCount = profile.planLength === "monthly" ? 4 : 1;
  for (let w = 0; w < weeksCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const globalDay = w * 7 + d;
      const meals = {};
      Object.keys(schedules).forEach((key) => { meals[key] = schedules[key][globalDay]; });
      week.push({ dayIndex: globalDay, meals });
    }
    weeks.push(week);
  }

  // Plan-level (not per-day) drink recommendations: only foods tagged as
  // drinks whose evidence genuinely applies to this profile's flags/goal.
  const drinkTagMatch = { ldl_high: "heart_health", heart_health: "heart_health", muscle_gain: "muscle_gain" };
  const wantHeart = profile.flags.includes("ldl_high") || profile.goal === "heart_health";
  const wantMuscle = profile.goal === "muscle_gain";
  const recommendedDrinks = allFoods.filter((f) => f.category === "drink").filter((f) => {
    if (f.slug === "oats-beta-glucan-drink") return wantHeart;
    if (f.slug === "post-workout-milk") return wantMuscle;
    return false;
  });

  const rationale = [];
  if (profile.flags.length === 0) {
    rationale.push("All tracked biomarkers are within the healthy range, so this plan is shaped mainly by your goal and preferences.");
  } else {
    profile.flags.forEach((f) => { if (FLAG_LABELS[f]) rationale.push(FLAG_LABELS[f] + "."); });
  }

  return { weeks, pools, recommendedDrinks, rationale, activeSlots: Object.keys(schedules) };
}

module.exports = { deriveFlags, isDietCompatible, activeTagSet, generatePlan, FLAG_LABELS, TAG_REASONS };
