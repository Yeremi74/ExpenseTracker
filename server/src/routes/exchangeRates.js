const express = require("express");
const { getDb } = require("../config/database");
const { parseCurrency } = require("../utils/currency");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { withUser } = require("../utils/userScope");

const router = express.Router();

router.get("/live", async (_req, res) => {
  try {
    const { fetchLiveRates } = require("../services/cotizave");
    const rates = await fetchLiveRates();
    res.json(rates);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to fetch live rates" });
  }
});

router.get("/for-date", async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "invalid date" });
    }

    const { fetchRatesForDate } = require("../services/cotizave");

    try {
      const rates = await fetchRatesForDate(date);
      return res.json(rates);
    } catch (err) {
      const doc = await getDb()
        .collection("exchange_rates")
        .findOne({ userId: req.userId });

      if (doc?.usdBcv > 0 && doc?.usdt > 0) {
        return res.json({
          usdBcv: doc.usdBcv,
          usdt: doc.usdt,
          updatedAt: doc.updatedAt,
          rateDate: date,
          source: "saved",
          warning: err.message,
        });
      }

      return res.status(502).json({ error: err.message || "Failed to fetch rates for date" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const doc = await getDb()
      .collection("exchange_rates")
      .findOne({ userId: req.userId });
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
      userId: req.userId,
      usdBcv: Number(usdBcv),
      usdt: Number(usdt),
      updatedAt: new Date(),
    };

    await getDb()
      .collection("exchange_rates")
      .updateOne({ userId: req.userId }, { $set: doc }, { upsert: true });

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
