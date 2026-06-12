function parseDateParts(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return { y, m, d };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid date");
  }
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}

function parseDateInput(value) {
  if (!value) return new Date();
  const { y, m, d } = parseDateParts(value);
  return new Date(Date.UTC(y, m - 1, d));
}

function parseDateStart(value) {
  const { y, m, d } = parseDateParts(value);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function parseDateEnd(value) {
  const { y, m, d } = parseDateParts(value);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function utcMonthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function addDaysUTC(value, days) {
  const { y, m, d } = parseDateParts(value);
  return new Date(Date.UTC(y, m - 1, d + days));
}

module.exports = {
  parseDateInput,
  parseDateStart,
  parseDateEnd,
  utcMonthRange,
  addDaysUTC,
};
