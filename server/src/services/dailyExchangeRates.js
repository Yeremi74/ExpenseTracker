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

async function snapshotTodayRates() {
  const live = await fetchLiveRates();
  return saveDailyRates(live, todayDateString());
}

async function getRatesForDate(date) {
  const stored = await getDailyRates(date);
  if (stored) return stored;

  if (date === todayDateString()) {
    return snapshotTodayRates();
  }

  return null;
}

module.exports = {
  getDailyRates,
  saveDailyRates,
  snapshotTodayRates,
  getRatesForDate,
};
