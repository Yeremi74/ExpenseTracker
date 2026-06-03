export function defaultWallet() {
  return { balanceUsdt: 0, ledgerFrom: null }
}

export function normalizeWallet(raw) {
  if (!raw || typeof raw !== 'object') return defaultWallet()
  const balanceUsdt = Number(raw.balanceUsdt)
  const ledgerFrom =
    typeof raw.ledgerFrom === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.ledgerFrom)
      ? raw.ledgerFrom
      : null
  return {
    balanceUsdt:
      Number.isFinite(balanceUsdt) && balanceUsdt >= 0 ? balanceUsdt : 0,
    ledgerFrom,
  }
}

/** USDT de movimientos con fecha >= ledgerFrom (día en que guardaste el saldo). */
export function sumUsdtFromLedger(rows, ledgerFrom) {
  if (!ledgerFrom || !Array.isArray(rows)) return 0
  return rows
    .filter((r) => r.date >= ledgerFrom)
    .reduce((acc, r) => acc + (Number(r.usdt) || 0), 0)
}

export function computeWalletAvailable(wallet, monthly) {
  const base = Number(wallet.balanceUsdt) || 0
  if (!wallet.ledgerFrom) return base
  const income = sumUsdtFromLedger(monthly.incomes, wallet.ledgerFrom)
  const expenses = sumUsdtFromLedger(monthly.expenses, wallet.ledgerFrom)
  return base + income - expenses
}

export function todayDateStr() {
  return new Date().toISOString().slice(0, 10)
}

export function ledgerDateLabel(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-')
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return dt.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
