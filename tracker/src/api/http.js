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
  const headers = new Headers(init.headers || {})
  if (
    init.body != null &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const url = resolveApiUrl(input)
  const res = await fetch(url, { ...init, headers })
  return res
}
