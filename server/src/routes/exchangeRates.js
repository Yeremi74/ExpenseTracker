const express = require("express");
const { getDb } = require("../config/database");
const { fetchLiveRates } = require("../services/cotizave");

const router = express.Router();

router.get("/live", async (_req, res) => {
  try {
    const rates = await fetchLiveRates();
    res.json(rates);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch live rates" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const doc = await getDb().collection("exchange_rates").findOne({ _id: "rates" });
    res.json({
      usdBcv: doc?.usdBcv ?? 0,
      usdt: doc?.usdt ?? 0,
      updatedAt: doc?.updatedAt ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const { usdBcv, usdt } = req.body;

    if (usdBcv == null || Number(usdBcv) <= 0) {
      return res.status(400).json({ error: "usdBcv must be greater than 0" });
    }
    if (usdt == null || Number(usdt) <= 0) {
      return res.status(400).json({ error: "usdt must be greater than 0" });
    }

    const doc = {
      _id: "rates",
      usdBcv: Number(usdBcv),
      usdt: Number(usdt),
      updatedAt: new Date(),
    };

    await getDb()
      .collection("exchange_rates")
      .updateOne({ _id: "rates" }, { $set: doc }, { upsert: true });

    res.json({
      usdBcv: doc.usdBcv,
      usdt: doc.usdt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
