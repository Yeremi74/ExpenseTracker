const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const COLLECTION = "user_settings";

const VALID_KEYS = new Set(["budget", "monthly", "wishlist", "fx_rates"]);

function defaultFor(key) {
  switch (key) {
    case "budget":
      return { needs: [], wants: [], savings: [], income: 0 };
    case "monthly":
      return { expenses: [], debts: [] };
    case "wishlist":
      return { personal: [], home: [] };
    case "fx_rates":
      return { usdtBs: "", bcvUsdBs: "" };
    default:
      return {};
  }
}

function parseUserObjectId(userId) {
  try {
    return new ObjectId(userId);
  } catch {
    return null;
  }
}

function resolveSettingContext(req, res) {
  const key = req.params.key;
  if (!VALID_KEYS.has(key)) {
    res.status(404).json({ error: "Clave desconocida" });
    return null;
  }
  const userId = parseUserObjectId(req.userId);
  if (!userId) {
    res.status(400).json({ error: "Usuario inválido" });
    return null;
  }
  return { key, userId };
}

router.use(requireAuth);

router.get("/:key", async (req, res) => {
  try {
    const ctx = resolveSettingContext(req, res);
    if (!ctx) return;
    const { key, userId } = ctx;
    const db = getDb();
    const doc = await db.collection(COLLECTION).findOne({ userId, key });
    const data = doc?.data != null ? doc.data : defaultFor(key);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error al leer datos" });
  }
});

router.put("/:key", async (req, res) => {
  try {
    const ctx = resolveSettingContext(req, res);
    if (!ctx) return;
    const { key, userId } = ctx;
    const body = req.body;
    if (body === undefined || typeof body !== "object" || body === null) {
      return res.status(400).json({ error: "El cuerpo debe ser un objeto JSON" });
    }
    const db = getDb();
    await db.collection(COLLECTION).updateOne(
      { userId, key },
      { $set: { data: body, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error al guardar datos" });
  }
});

module.exports = router;
