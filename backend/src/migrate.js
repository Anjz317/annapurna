"use strict";
const fs = require("fs");
const path = require("path");
const db = require("./db");

async function migrate() {
  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(sql);
  console.log(`Schema applied (${db.usingTurso ? "Turso" : "local SQLite"}).`);
  await db.close();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
