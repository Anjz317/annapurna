"use strict";
// Local dev entry point only. Vercel never runs this file -- it imports
// app.js directly from api/index.js instead (a persistent app.listen()
// process doesn't fit Vercel's serverless-function model).
const app = require("./app");

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Annapurna backend listening on http://localhost:${PORT}`);
});
