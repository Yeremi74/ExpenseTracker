const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const { signToken, requireAuth } = require("../middleware/auth");
const { sendPasswordResetOtp } = require("../services/mail");

const router = express.Router();
const USERS = "users";
const PASSWORD_RESET_OTPS = "password_reset_otps";

const OTP_TTL_MS = 15 * 60 * 1000;
const MIN_RESEND_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function generateOtpDigits() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

const RESET_EMAIL_SENT_MESSAGE =
  "Te hemos enviado un código a tu correo.";

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

router.post("/password-reset/request", async (req, res) => {
  const logPrefix = "[password-reset/request]";
  try {
    const email = normalizeEmail(req.body?.email);
    console.log(logPrefix, "inicio", {
      email,
      at: new Date().toISOString(),
    });
    if (!email || !isValidEmail(email)) {
      console.log(logPrefix, "400 email inválido");
      return res.status(400).json({ error: "Email no válido" });
    }

    const db = getDb();
    const user = await db.collection(USERS).findOne({ email });
    if (!user) {
      console.log(logPrefix, "404 usuario no existe", { email });
      return res.status(404).json({
        error: "No hay ninguna cuenta registrada con ese email.",
      });
    }

    const col = db.collection(PASSWORD_RESET_OTPS);
    const existing = await col.findOne({ email });
    const now = Date.now();
    const lastSentMs = existing?.lastSentAt
      ? now - new Date(existing.lastSentAt).getTime()
      : null;
    console.log(logPrefix, "estado cooldown", {
      email,
      hayRegistroPrevio: Boolean(existing),
      lastSentAt: existing?.lastSentAt ?? null,
      msDesdeUltimoEnvio: lastSentMs,
      minResendMs: MIN_RESEND_MS,
      bloqueadoPorCooldown:
        Boolean(existing?.lastSentAt) &&
        lastSentMs != null &&
        lastSentMs < MIN_RESEND_MS,
    });
    if (
      existing?.lastSentAt &&
      now - new Date(existing.lastSentAt).getTime() < MIN_RESEND_MS
    ) {
      console.log(logPrefix, "429 rate limit", {
        email,
        msDesdeUltimoEnvio: lastSentMs,
        esperarMs: MIN_RESEND_MS - (lastSentMs ?? 0),
      });
      return res.status(429).json({
        error: "Espera un minuto antes de pedir otro código",
      });
    }

    const plainOtp = generateOtpDigits();
    const codeHash = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(now + OTP_TTL_MS);

    await col.updateOne(
      { email },
      {
        $set: {
          codeHash,
          expiresAt,
          lastSentAt: new Date(now),
          failedAttempts: 0,
        },
      },
      { upsert: true }
    );
    console.log(logPrefix, "OTP guardado en DB, enviando correo…", { email });

    try {
      await sendPasswordResetOtp(email, plainOtp);
    } catch (mailErr) {
      console.error(logPrefix, "fallo SMTP", mailErr);
      await col.deleteOne({ email });
      return res.status(503).json({
        error:
          mailErr.message ||
          "No se pudo enviar el correo. Revisa la configuración SMTP.",
      });
    }

    console.log(logPrefix, "200 correo enviado OK", { email });
    res.json({ ok: true, message: RESET_EMAIL_SENT_MESSAGE });
  } catch (err) {
    console.error(logPrefix, "500", err);
    res.status(500).json({ error: err.message || "Error" });
  }
});

/** Valida email + código sin cambiar contraseña ni consumir el OTP (paso previo al confirm). */
router.post("/password-reset/verify-code", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = req.body?.code;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Email no válido" });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return res
        .status(400)
        .json({ error: "Introduce el código de 6 dígitos" });
    }

    const db = getDb();
    const col = db.collection(PASSWORD_RESET_OTPS);
    const doc = await col.findOne({ email });
    if (!doc || !doc.codeHash) {
      return res.status(400).json({
        error: "Código incorrecto o caducado. Solicita uno nuevo.",
      });
    }
    if (new Date(doc.expiresAt).getTime() < Date.now()) {
      await col.deleteOne({ email });
      return res.status(400).json({
        error: "El código ha caducado. Solicita uno nuevo.",
      });
    }

    const attempts = doc.failedAttempts || 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await col.deleteOne({ email });
      return res.status(400).json({
        error: "Demasiados intentos. Solicita un código nuevo.",
      });
    }

    const match = await bcrypt.compare(code.trim(), doc.codeHash);
    if (!match) {
      await col.updateOne({ email }, { $inc: { failedAttempts: 1 } });
      return res.status(400).json({ error: "Código incorrecto" });
    }

    const user = await db.collection(USERS).findOne({ email });
    if (!user) {
      await col.deleteOne({ email });
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error" });
  }
});

router.post("/password-reset/confirm", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = req.body?.code;
    const newPassword = req.body?.newPassword;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Email no válido" });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ error: "Introduce el código de 6 dígitos" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }

    const db = getDb();
    const col = db.collection(PASSWORD_RESET_OTPS);
    const doc = await col.findOne({ email });
    if (!doc || !doc.codeHash) {
      return res.status(400).json({
        error: "Código incorrecto o caducado. Solicita uno nuevo.",
      });
    }
    if (new Date(doc.expiresAt).getTime() < Date.now()) {
      await col.deleteOne({ email });
      return res.status(400).json({
        error: "El código ha caducado. Solicita uno nuevo.",
      });
    }

    const attempts = doc.failedAttempts || 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await col.deleteOne({ email });
      return res.status(400).json({
        error: "Demasiados intentos. Solicita un código nuevo.",
      });
    }

    const match = await bcrypt.compare(code.trim(), doc.codeHash);
    if (!match) {
      await col.updateOne(
        { email },
        { $inc: { failedAttempts: 1 } }
      );
      return res.status(400).json({ error: "Código incorrecto" });
    }

    const user = await db.collection(USERS).findOne({ email });
    if (!user) {
      await col.deleteOne({ email });
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .collection(USERS)
      .updateOne({ _id: user._id }, { $set: { passwordHash } });
    await col.deleteOne({ email });

    const userId = user._id.toString();
    const token = signToken({ userId, email: user.email });

    res.json({
      token,
      user: { id: userId, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error" });
  }
});

/** Con sesión válida: contraseña actual + nueva. No usa OTP (el correo ya está verificado al iniciar sesión). */
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ error: "Indica tu contraseña actual" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        error: "La nueva contraseña debe tener al menos 8 caracteres",
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "La nueva contraseña debe ser distinta a la actual",
      });
    }

    const db = getDb();
    let oid;
    try {
      oid = new ObjectId(req.userId);
    } catch {
      return res.status(401).json({ error: "Usuario inválido" });
    }
    const user = await db.collection(USERS).findOne({ _id: oid });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: "La contraseña actual no es correcta" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .collection(USERS)
      .updateOne({ _id: oid }, { $set: { passwordHash } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error" });
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
