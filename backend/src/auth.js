"use strict";
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const TOKEN_TTL = "30d";
const COOKIE_NAME = "annapurna_token";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "not_authenticated" });
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "not_authenticated" });
  }
}

module.exports = { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, requireAuth, COOKIE_NAME };
