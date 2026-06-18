export const CURRENCIES = [
  { value: 'ves', label: 'Bolívares' },
  { value: 'usd_bcv', label: 'Dólar BCV' },
  { value: 'usdt', label: 'USDT' },
]

export const CURRENCY_LABELS = Object.fromEntries(
  CURRENCIES.map((c) => [c.value, c.label])
)

export function convertToVes(amount, currency, rates) {
  const value = Number(amount) || 0
  if (currency === 'usd_bcv') return value * (rates?.usdBcv || 0)
  if (currency === 'usdt') return value * (rates?.usdt || 0)
  return value
}

export function convertFromVes(amount, currency, rates) {
  const value = Number(amount) || 0
  if (currency === 'ves') return value
  if (currency === 'usd_bcv') {
    const rate = rates?.usdBcv || 0
    return rate > 0 ? value / rate : 0
  }
  if (currency === 'usdt') {
    const rate = rates?.usdt || 0
    return rate > 0 ? value / rate : 0
  }
  return value
}

export function convertUsdtToUsdBcv(amount, rates) {
  const value = Number(amount) || 0
  const usdtRate = rates?.usdt || 0
  const usdBcvRate = rates?.usdBcv || 0
  if (usdtRate <= 0 || usdBcvRate <= 0) return 0
  return value * (usdtRate / usdBcvRate)
}

export function convertUsdBcvToUsdt(amount, rates) {
  const value = Number(amount) || 0
  const usdtRate = rates?.usdt || 0
  const usdBcvRate = rates?.usdBcv || 0
  if (usdtRate <= 0 || usdBcvRate <= 0) return 0
  return value * (usdBcvRate / usdtRate)
}
