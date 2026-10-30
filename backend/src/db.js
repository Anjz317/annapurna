"use strict";
// Single DB abstraction used by the whole app. Same SQL dialect either way:
// - No DATABASE_URL set -> local SQLite file via Node's built-in node:sqlite
//   (no install needed; this is the "SQLite on this computer" dev path).
// - DATABASE_URL set (+ DATABASE_AUTH_TOKEN) -> hosted Turso/libSQL, for the
//   live/public deployment. Everything else in the app is unaware of which.

require("dotenv").config();
const path = require("path");
const fs = require("fs");

const usingTurso = Boolean(process.env.DATABASE_URL);

let impl;

if (usingTurso) {
  const { createClient } = require("@libsql/client");
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  impl = {
    async run(sql, params = []) {
      const res = await client.execute({ sql, args: params });
      return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), changes: res.rowsAffected ?? 0 };
    },
    async get(sql, params = []) {
      const res = await client.execute({ sql, args: params });
      return res.rows[0];
    },
    async all(sql, params = []) {
      const res = await client.execute({ sql, args: params });
      return res.rows;
    },
    async exec(sql) {
      await client.executeMultiple(sql);
    },
    async close() {
      client.close();
    },
  };
} else {
  const { DatabaseSync } = require("node:sqlite");
  const dbDir = path.join(__dirname, "..", "db");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "annapurna.db");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");

  impl = {
    async run(sql, params = []) {
      const stmt = db.prepare(sql);
      const res = stmt.run(...params);
      return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), changes: Number(res.changes ?? 0) };
    },
    async get(sql, params = []) {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    },
    async all(sql, params = []) {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    },
    async exec(sql) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

module.exports = impl;
module.exports.usingTurso = usingTurso;
