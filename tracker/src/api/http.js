import { getToken, clearToken } from './authStorage.js'

function resolveApiUrl(input) {
  if (typeof input !== 'string') return input
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return trimmed
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
}

export async function apiFetch(input, init = {}) {
  const token = getToken()
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (
    init.body != null &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const url = resolveApiUrl(input)
  const res = await fetch(url, { ...init, headers })

  if (res.status === 401) {
    clearToken()
    const path =
      typeof window !== 'undefined' ? window.location.pathname || '' : ''
    if (path && !path.startsWith('/login') && !path.startsWith('/registro')) {
      window.location.replace('/login')
    }
  }

  return res
}
