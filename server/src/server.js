require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectMongo } = require("./config/database");
const { ensureIndexes } = require("./db/ensureIndexes");
const authRoutes = require("./routes/auth.routes");
const settingsRoutes = require("./routes/settings.routes");
const wishlistRoutes = require("./routes/wishlist.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tracker-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/wishlist", wishlistRoutes);

async function main() {
  await connectMongo();
  await ensureIndexes();
  app.listen(PORT, () => {
    console.log(`API escuchando en http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
