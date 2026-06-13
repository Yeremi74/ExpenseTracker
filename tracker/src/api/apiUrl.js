export function resolveApiUrl(input) {
  if (typeof input !== 'string') return input
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return trimmed
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
}
