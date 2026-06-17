const CURRENCIES = ["ves", "usd_bcv", "usdt"];

function parseCurrency(value) {
  const currency = value || "ves";
  if (!CURRENCIES.includes(currency)) {
    throw new Error("currency must be ves, usd_bcv or usdt");
  }
  return currency;
}

async function getExchangeRates(db, userId) {
  const doc = await db.collection("exchange_rates").findOne({ userId });
  return {
    usdBcv: doc?.usdBcv ?? 0,
    usdt: doc?.usdt ?? 0,
    updatedAt: doc?.updatedAt ?? null,
  };
}

function convertToVes(amount, currency, rates) {
  const value = Number(amount) || 0;
  const normalized = currency || "ves";

  if (normalized === "ves") return value;
  if (normalized === "usd_bcv") return value * (rates.usdBcv || 0);
  if (normalized === "usdt") return value * (rates.usdt || 0);
  return value;
}

function sumConverted(items, amountKey, currencyKey, rates) {
  return items.reduce(
    (sum, item) =>
      sum + convertToVes(item[amountKey], item[currencyKey] || "ves", rates),
    0
  );
}

module.exports = {
  CURRENCIES,
  parseCurrency,
  getExchangeRates,
  convertToVes,
  sumConverted,
};
