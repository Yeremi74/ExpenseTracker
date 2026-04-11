const { getDb } = require("../config/database");

async function ensureIndexes() {
  const db = getDb();
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db
    .collection("user_settings")
    .createIndex({ userId: 1, key: 1 }, { unique: true });
  await db
    .collection("password_reset_otps")
    .createIndex({ email: 1 }, { unique: true });
  await db
    .collection("password_reset_otps")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

module.exports = { ensureIndexes };
