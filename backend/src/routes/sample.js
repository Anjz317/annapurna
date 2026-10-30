"use strict";
// No-login demo path: the 6 sample personas, plans generated through the
// real server-side rule engine, nothing read from or written to the DB
// for a real user. Kept alongside signup/login, not instead of it.

const express = require("express");
const ruleEngine = require("../ruleEngine");
const { PERSONAS, findPersona } = require("../samplePersonas");

const router = express.Router();

router.get("/personas", (req, res) => {
  const list = PERSONAS.map((p) => ({
    id: p.id, name: p.name, age: p.age, gender: p.gender, city: p.city,
    diet: p.diet, region: p.region, goal: p.goal,
    flags: ruleEngine.deriveFlags(p.bio),
  }));
  res.json(list);
});

router.get("/plan", async (req, res) => {
  const persona = findPersona(req.query.personaId);
  if (!persona) return res.status(404).json({ error: "unknown_persona" });
  const planLength = req.query.length === "monthly" ? "monthly" : "weekly";

  const flags = ruleEngine.deriveFlags(persona.bio);
  const profile = { diet: persona.diet, region: persona.region, goal: persona.goal, flags, planLength };
  const result = await ruleEngine.generatePlan(profile);

  res.json({
    persona: { id: persona.id, name: persona.name, age: persona.age, gender: persona.gender, city: persona.city },
    planLength,
    profile: { diet: profile.diet, region: profile.region, goal: profile.goal, flags: profile.flags },
    rationale: result.rationale,
    recommendedDrinks: result.recommendedDrinks.map((d) => ({
      id: d.id, name: d.name, calories: d.calories, protein_g: d.protein_g, evidenceNote: d.evidence_note,
    })),
    weeks: result.weeks,
  });
});

module.exports = router;
