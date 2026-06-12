import { CURRENCY_LABELS } from './currency.js'

const numberFormat = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatAmount(value, currency = 'ves') {
  const n = value ?? 0
  const formatted = numberFormat.format(n)

  if (currency === 'usd_bcv') return `$ ${formatted} BCV`
  if (currency === 'usdt') return `${formatted} USDT`
  return `${formatted} Bs.`
}

export function formatCurrency(value) {
  return formatAmount(value, 'ves')
}

export function formatCurrencyShort(currency) {
  return CURRENCY_LABELS[currency] || currency
}

export function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayInputDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
