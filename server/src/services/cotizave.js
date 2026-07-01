const COTIZAVE_BASE = "https://api.cotizave.com";

const USDT_MARKET_PRIORITY = [
  "binance_p2p",
  "binance",
  "bybit_p2p",
  "bybit",
  "okx_p2p",
  "okx",
];

function ceilRate(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.ceil(Number(value) * factor) / factor;
}

function pickUsdtRate(rates) {
  for (const market of USDT_MARKET_PRIORITY) {
    const match = rates.find((rate) => rate.market === market);
    if (match?.mid != null || match?.rate != null) {
      return {
        usdt: match.mid ?? match.rate,
        usdtSource: market,
        usdtUpdatedAt: match.updated_at ?? null,
      };
    }
  }

  const p2pRates = rates.filter((rate) => rate.type === "p2p");
  if (p2pRates.length === 0) return null;

  const average =
    p2pRates.reduce((sum, rate) => sum + (rate.mid ?? rate.rate ?? 0), 0) /
    p2pRates.length;

  return {
    usdt: average,
    usdtSource: "p2p_average",
    usdtUpdatedAt: p2pRates[0]?.updated_at ?? null,
  };
}

function parseAuthenticatedRates(data) {
  const rates = data.rates ?? [];
  const bcv = rates.find(
    (rate) => rate.market === "reference" || rate.type === "reference"
  );
  const usdt = pickUsdtRate(rates);

  if (!bcv?.mid) {
    throw new Error("BCV rate unavailable");
  }
  if (!usdt) {
    throw new Error("USDT rate unavailable");
  }

  return {
    usdBcv: ceilRate(bcv.mid),
    usdBcvUpdatedAt: bcv.updated_at ?? data.fetched_at ?? null,
    usdt: ceilRate(usdt.usdt),
    usdtSource: usdt.usdtSource,
    usdtUpdatedAt: usdt.usdtUpdatedAt ?? data.fetched_at ?? null,
    fetchedAt: data.fetched_at ?? null,
    source: "cotizave",
  };
}

function parsePublicCalculator(data) {
  const results = data.results ?? [];
  const bcv = results.find((rate) => rate.market === "reference");
  const usdt = pickUsdtRate(results);

  if (!bcv?.rate) {
    throw new Error("BCV rate unavailable");
  }
  if (!usdt) {
    throw new Error("USDT rate unavailable");
  }

  return {
    usdBcv: ceilRate(bcv.rate),
    usdBcvUpdatedAt: data.fetched_at ?? null,
    usdt: ceilRate(usdt.usdt),
    usdtSource: usdt.usdtSource,
    usdtUpdatedAt: data.fetched_at ?? null,
    fetchedAt: data.fetched_at ?? null,
    source: "cotizave_public",
  };
}

async function fetchFromAuthenticatedApi(apiKey) {
  const response = await fetch(`${COTIZAVE_BASE}/v1/fx/rates`, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Cotizave API request failed");
  }

  return parseAuthenticatedRates(data);
}

async function fetchFromPublicCalculator() {
  const response = await fetch(
    `${COTIZAVE_BASE}/v1/fx/public/calculator?amount=1&from=USD&to=VES`,
    { headers: { Accept: "application/json" } }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Cotizave public API request failed");
  }

  return parsePublicCalculator(data);
}

async function fetchLiveRates() {
  const apiKey = process.env.COTIZAVE_API_KEY?.trim();
  let lastError = null;

  if (apiKey) {
    try {
      return await fetchFromAuthenticatedApi(apiKey);
    } catch (err) {
      lastError = err;
      console.error("Cotizave authenticated API failed:", err.message);
    }
  }

  try {
    return await fetchFromPublicCalculator();
  } catch (err) {
    lastError = err;
  }

  if (!apiKey) {
    throw new Error(
      "Cotizave requiere COTIZAVE_API_KEY en producción. Crea una key gratis en app.cotizave.com"
    );
  }

  throw lastError || new Error("Failed to fetch live rates from Cotizave");
}

module.exports = { fetchLiveRates };
