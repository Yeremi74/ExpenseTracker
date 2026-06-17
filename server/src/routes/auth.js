const express = require("express");
const { getDb } = require("../config/database");
const { serializeDoc } = require("../utils/mongo");
const authenticate = require("../middleware/authenticate");
const {
  normalizeEmail,
  isValidEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  signToken,
} = require("../utils/auth");

const router = express.Router();

function serializeUser(doc) {
  const user = serializeDoc(doc);
  delete user.passwordHash;
  return user;
}

router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const name = req.body.name?.trim() || "";

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existing = await getDb().collection("users").findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const doc = {
      email,
      passwordHash,
      name,
      createdAt: new Date(),
    };

    const result = await getDb().collection("users").insertOne(doc);
    const user = { ...doc, _id: result.insertedId };
    const token = signToken(result.insertedId.toString());

    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await getDb().collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

module.exports = router;
