const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const { verifyToken } = require("../utils/auth");

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    if (!payload?.sub || !ObjectId.isValid(payload.sub)) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await getDb()
      .collection("users")
      .findOne({ _id: new ObjectId(payload.sub) });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authenticate;
