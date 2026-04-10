const express = require("express");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();
const USERS = "users";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Email no válido" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const db = getDb();
    const existing = await db.collection(USERS).findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const { insertedId } = await db.collection(USERS).insertOne({
      email,
      passwordHash,
      createdAt: now,
    });

    const userId = insertedId.toString();
    const token = signToken({ userId, email });

    res.status(201).json({
      token,
      user: { id: userId, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error al registrar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || typeof password !== "string") {
      return res.status(400).json({ error: "Email y contraseña obligatorios" });
    }

    const db = getDb();
    const user = await db.collection(USERS).findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const userId = user._id.toString();
    const token = signToken({ userId, email: user.email });

    res.json({
      token,
      user: { id: userId, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error al iniciar sesión" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    let oid;
    try {
      oid = new ObjectId(req.userId);
    } catch {
      return res.status(401).json({ error: "Usuario inválido" });
    }
    const user = await db.collection(USERS).findOne(
      { _id: oid },
      { projection: { passwordHash: 0 } }
    );
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    res.json({
      user: { id: user._id.toString(), email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error" });
  }
});

module.exports = router;
