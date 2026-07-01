const express = require("express");
const { getDb } = require("../config/database");
const { withUser } = require("../utils/userScope");
const { todayDateString } = require("../utils/date");
const { getRatesForDate, getDailyRates, snapshotTodayRates } = require("../services/dailyExchangeRates");

const router = express.Router();

router.post("/snapshot", async (_req, res) => {
  try {
    const rates = await snapshotTodayRates();
    res.json(rates);
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to snapshot exchange rates" });
  }
});

router.get("/live", async (req, res) => {
  try {
    const { fetchLiveRates } = require("../services/cotizave");
    const rates = await fetchLiveRates();
    return res.json(rates);
  } catch (err) {
    const daily = await getDailyRates(todayDateString());
    if (daily) {
      return res.json({
        ...daily,
        warning: "No se pudieron obtener tasas en vivo. Mostrando el último snapshot guardado.",
      });
    }

    const doc = await getDb()
      .collection("exchange_rates")
      .findOne({ userId: req.userId });

    if (doc?.usdBcv > 0 && doc?.usdt > 0) {
      return res.json({
        usdBcv: doc.usdBcv,
        usdt: doc.usdt,
        fetchedAt: doc.updatedAt ?? null,
        source: "saved",
        warning: "No se pudieron obtener tasas en vivo. Usando tus tasas guardadas.",
      });
    }

    res.status(502).json({ error: err.message || "Failed to fetch live rates" });
  }
});

router.get("/for-date", async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "invalid date" });
    }

    const rates = await getRatesForDate(date);
    if (rates) {
      return res.json(rates);
    }

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
        warning: "No hay tasas guardadas para esta fecha. Usando tus tasas manuales.",
      });
    }

    return res.status(404).json({
      error: "No hay tasas guardadas para esta fecha. Entra a la app ese día o configura tasas en /rates.",
    });
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
