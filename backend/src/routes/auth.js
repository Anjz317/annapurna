"use strict";
const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, requireAuth } = require("../auth");
const { getCurrentProfile } = require("../profileHelpers");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: "invalid_email", message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "weak_password", message: "Password must be at least 8 characters." });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
  if (existing) {
    return res.status(409).json({ error: "email_taken", message: "An account with that email already exists." });
  }

  const passwordHash = await hashPassword(password);
  const result = await db.run("INSERT INTO users (email, password_hash) VALUES (?, ?)", [normalizedEmail, passwordHash]);
  const token = signToken(result.lastInsertRowid);
  setAuthCookie(res, token);
  res.status(201).json({ id: result.lastInsertRowid, email: normalizedEmail });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid_request" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.get("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (!user) return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect." });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect." });

  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await db.get("SELECT id, email, created_at FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(401).json({ error: "not_authenticated" });
  const profile = await getCurrentProfile(req.userId);
  res.json({
    user,
    profile,
    profileComplete: Boolean(profile.biomarkers && profile.goal && profile.dietPreference),
  });
});

module.exports = router;
