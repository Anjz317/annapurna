"use strict";
// Vercel Node.js Function entry point. Express apps are directly compatible
// with Vercel's (req, res) handler signature, so this just re-exports the
// already-configured app -- no listen() call, Vercel invokes it per request.
module.exports = require("../backend/src/app");
