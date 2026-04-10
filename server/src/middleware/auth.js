const jwt = require("jsonwebtoken");

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || !String(s).trim()) {
    throw new Error("JWT_SECRET no está definida en .env");
  }
  return String(s).trim();
}

function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const token = h.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const payload = jwt.verify(token, jwtSecret());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      return res.status(401).json({ error: "Token inválido" });
    }
    req.userId = sub;
    req.userEmail = typeof payload.email === "string" ? payload.email : "";
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function signToken({ userId, email }) {
  return jwt.sign(
    { sub: userId, email },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { requireAuth, signToken, jwtSecret };
