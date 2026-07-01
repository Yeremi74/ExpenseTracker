const { getDb } = require("../config/database");
const { todayDateString } = require("../utils/date");
const { fetchLiveRates } = require("./cotizave");

const COLLECTION = "daily_exchange_rates";

function toDailyResponse(doc) {
  return {
    usdBcv: doc.usdBcv,
    usdt: doc.usdt,
    usdtSource: doc.usdtSource ?? null,
    usdBcvUpdatedAt: doc.usdBcvUpdatedAt ?? null,
    usdtUpdatedAt: doc.usdtUpdatedAt ?? null,
    fetchedAt: doc.fetchedAt ?? doc.savedAt ?? null,
    rateDate: doc.date,
    source: "daily_snapshot",
  };
}

async function getDailyRates(date) {
  const doc = await getDb().collection(COLLECTION).findOne({ date });
  if (!doc?.usdBcv || !doc?.usdt) return null;
  return toDailyResponse(doc);
}

async function saveDailyRates(liveRates, date = todayDateString()) {
  const doc = {
    date,
    usdBcv: liveRates.usdBcv,
    usdt: liveRates.usdt,
    usdtSource: liveRates.usdtSource ?? null,
    usdBcvUpdatedAt: liveRates.usdBcvUpdatedAt ?? null,
    usdtUpdatedAt: liveRates.usdtUpdatedAt ?? null,
    fetchedAt: liveRates.fetchedAt ?? null,
    cotizaveSource: liveRates.source ?? null,
    savedAt: new Date(),
  };

  await getDb()
    .collection(COLLECTION)
    .updateOne({ date }, { $set: doc }, { upsert: true });

  return toDailyResponse(doc);
}

async function getSavedUserRates(userId) {
  if (!userId) return null;

  const doc = await getDb().collection("exchange_rates").findOne({ userId });
  if (!doc?.usdBcv || !doc?.usdt) return null;

  return {
    usdBcv: doc.usdBcv,
    usdt: doc.usdt,
    fetchedAt: doc.updatedAt ?? null,
    source: "saved",
  };
}

async function resolveLiveRates(userId) {
  try {
    return await fetchLiveRates();
  } catch (liveErr) {
    const daily = await getDailyRates(todayDateString());
    if (daily) {
      return {
        ...daily,
        warning:
          "No se pudieron obtener tasas en vivo. Mostrando el último snapshot guardado.",
      };
    }

    const saved = await getSavedUserRates(userId);
    if (saved) {
      return {
        ...saved,
        warning:
          "No se pudieron obtener tasas en vivo. Usando tus tasas guardadas.",
      };
    }

    throw liveErr;
  }
}

async function snapshotTodayRates(userId) {
  const existing = await getDailyRates(todayDateString());
  if (existing) return existing;

  const rates = await resolveLiveRates(userId);
  if (rates.source === "daily_snapshot") {
    return rates;
  }

  return saveDailyRates(rates, todayDateString());
}

async function getRatesForDate(date, userId) {
  const stored = await getDailyRates(date);
  if (stored) return stored;

  if (date === todayDateString()) {
    return snapshotTodayRates(userId);
  }

  return null;
}

module.exports = {
  getDailyRates,
  saveDailyRates,
  snapshotTodayRates,
  getRatesForDate,
  resolveLiveRates,
};
