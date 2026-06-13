const { getDb } = require("../config/database");

function ensureReady(_req, res, next) {
  try {
    getDb();
    next();
  } catch {
    res.status(503).json({ error: "Service is starting up, please retry." });
  }
}

module.exports = ensureReady;
