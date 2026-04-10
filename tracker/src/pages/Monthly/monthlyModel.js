export const LEGACY_STORAGE_RATES = 'tracker-fx-rates-prefs'
export const LEGACY_STORAGE_MONTHLY = 'tracker-monthly-items'

export const UNITS = [
  { value: 'usdt', label: 'USDT' },
  { value: 'bs', label: 'Bolívares' },
  { value: 'usd_bcv', label: 'USD BCV' },
]

export function normalizeRates(raw) {
  if (!raw || typeof raw !== 'object') return { usdtBs: '', bcvUsdBs: '' }
  return {
    usdtBs: raw.usdtBs != null ? String(raw.usdtBs) : '',
    bcvUsdBs: raw.bcvUsdBs != null ? String(raw.bcvUsdBs) : '',
  }
}

export function loadLegacyRates() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_RATES)
    if (!raw) return null
    return normalizeRates(JSON.parse(raw))
  } catch {
    return null
  }
}

export function loadLegacyMonthly() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_MONTHLY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const expenses = Array.isArray(data.expenses) ? data.expenses : []
    const debts = Array.isArray(data.debts) ? data.debts : []
    return {
      expenses: expenses.filter(validItem).map(normalizeExpense),
      debts: debts.filter(validItem).map(normalizeDebt),
    }
  } catch {
    return null
  }
}

export function isFxRatesEmpty(r) {
  const n = normalizeRates(r)
  return !String(n.usdtBs).trim() && !String(n.bcvUsdBs).trim()
}

export function isMonthlyEmpty(d) {
  if (!d) return true
  const noExp = !Array.isArray(d.expenses) || d.expenses.length === 0
  const noDebt = !Array.isArray(d.debts) || d.debts.length === 0
  return noExp && noDebt
}

export function validItem(row) {
  return (
    row &&
    typeof row.concept === 'string' &&
    typeof row.date === 'string' &&
    typeof row.bs === 'number' &&
    typeof row.usdt === 'number' &&
    typeof row.usdBcv === 'number'
  )
}

function baseFields(row) {
  return {
    id: row.id || crypto.randomUUID(),
    concept: row.concept,
    description:
      typeof row.description === 'string' ? row.description : '',
    date: row.date,
    bs: Number(row.bs) || 0,
    usdt: Number(row.usdt) || 0,
    usdBcv: Number(row.usdBcv) || 0,
  }
}

export function normalizeExpense(row) {
  return baseFields(row)
}

export function normalizeDebt(row) {
  return {
    ...baseFields(row),
    debtFlow: row.debtFlow === 'receive' ? 'receive' : 'pay',
  }
}

export function normalizeMonthlyPayload(data) {
  if (typeof data !== 'object' || data === null)
    return { expenses: [], debts: [] }
  const expenses = Array.isArray(data.expenses) ? data.expenses : []
  const debts = Array.isArray(data.debts) ? data.debts : []
  return {
    expenses: expenses.filter(validItem).map(normalizeExpense),
    debts: debts.filter(validItem).map(normalizeDebt),
  }
}

export function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function emptyDraftExpense() {
  return {
    concept: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    unit: 'usdt',
  }
}

export function emptyDraftDebt() {
  return {
    ...emptyDraftExpense(),
    debtFlow: 'pay',
  }
}
