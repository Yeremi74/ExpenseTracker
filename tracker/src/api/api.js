import { apiFetch } from './http.js'

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function buildFilterParams(filters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '') {
      params.set(`filter[${key}]`, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function getDashboardSummary() {
  return apiFetch('/api/dashboard/summary').then(parseResponse)
}

export function getDashboardMonthly() {
  return apiFetch('/api/dashboard/monthly').then(parseResponse)
}

export function getDashboardAlerts() {
  return apiFetch('/api/dashboard/alerts').then(parseResponse)
}

export function getDashboardTrends(months = 6) {
  return apiFetch(`/api/dashboard/trends?months=${months}`).then(parseResponse)
}

export function getDashboardExpensesByCategory() {
  return apiFetch('/api/dashboard/expenses-by-category').then(parseResponse)
}

export function getDashboardRecent(limit = 5) {
  return apiFetch(`/api/dashboard/recent?limit=${limit}`).then(parseResponse)
}

export function getCategories(type) {
  const params = type ? `?filter[type]=${type}` : ''
  return apiFetch(`/api/categories${params}`).then(parseResponse)
}

export function createCategory(body) {
  return apiFetch('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function updateCategory(id, body) {
  return apiFetch(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, { method: 'DELETE' }).then(parseResponse)
}

export function getTransactions(filters = {}) {
  return apiFetch(`/api/transactions${buildFilterParams(filters)}`).then(parseResponse)
}

export function createTransaction(body) {
  return apiFetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function updateTransaction(id, body) {
  return apiFetch(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteTransaction(id) {
  return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }).then(parseResponse)
}

export function getDebts() {
  return apiFetch('/api/debts').then(parseResponse)
}

export function createDebt(body) {
  return apiFetch('/api/debts', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function updateDebt(id, body) {
  return apiFetch(`/api/debts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteDebt(id) {
  return apiFetch(`/api/debts/${id}`, { method: 'DELETE' }).then(parseResponse)
}

export function getDebtPayments(debtId) {
  return apiFetch(`/api/debts/${debtId}/payments`).then(parseResponse)
}

export function createDebtPayment(debtId, body) {
  return apiFetch(`/api/debts/${debtId}/payments`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteDebtPayment(debtId, paymentId) {
  return apiFetch(`/api/debts/${debtId}/payments/${paymentId}`, {
    method: 'DELETE',
  }).then(parseResponse)
}

export function getReminders() {
  return apiFetch('/api/reminders').then(parseResponse)
}

export function createReminder(body) {
  return apiFetch('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function updateReminder(id, body) {
  return apiFetch(`/api/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteReminder(id) {
  return apiFetch(`/api/reminders/${id}`, { method: 'DELETE' }).then(parseResponse)
}

export function getCalendarEvents(year, month) {
  return apiFetch(`/api/calendar/events?year=${year}&month=${month}`).then(parseResponse)
}

export function getBudgets() {
  return apiFetch('/api/budgets').then(parseResponse)
}

export function upsertBudget(body) {
  return apiFetch('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(parseResponse)
}

export function deleteBudget(id) {
  return apiFetch(`/api/budgets/${id}`, { method: 'DELETE' }).then(parseResponse)
}

export function getExchangeRates() {
  return apiFetch('/api/exchange-rates').then(parseResponse)
}

export function fetchLiveRates() {
  return apiFetch('/api/exchange-rates/live').then(parseResponse)
}

export function updateExchangeRates(body) {
  return apiFetch('/api/exchange-rates', {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then(parseResponse)
}
