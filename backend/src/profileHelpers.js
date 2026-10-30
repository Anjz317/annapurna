"use strict";
const db = require("./db");

async function latestBiomarkers(userId) {
  return db.get("SELECT * FROM biomarker_readings WHERE user_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1", [userId]);
}
async function latestGoal(userId) {
  return db.get("SELECT * FROM goal_history WHERE user_id = ? ORDER BY started_at DESC, id DESC LIMIT 1", [userId]);
}
async function latestDietPreference(userId) {
  return db.get("SELECT * FROM diet_preference_history WHERE user_id = ? ORDER BY changed_at DESC, id DESC LIMIT 1", [userId]);
}

async function getCurrentProfile(userId) {
  const [biomarkers, goal, dietPreference] = await Promise.all([
    latestBiomarkers(userId),
    latestGoal(userId),
    latestDietPreference(userId),
  ]);
  return { biomarkers: biomarkers || null, goal: goal || null, dietPreference: dietPreference || null };
}

module.exports = { latestBiomarkers, latestGoal, latestDietPreference, getCurrentProfile };
