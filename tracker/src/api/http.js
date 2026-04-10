import { getToken, clearToken } from './authStorage.js'
import { setServerWaking } from './serverWakeStore.js'

const WARM_CACHE_MS = 10_000
const WAKE_RETRY_INTERVAL_MS = 10_000

let lastWakeOkAt = 0
let wakePromise = null

function resolveApiUrl(input) {
  if (typeof input !== 'string') return input
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return trimmed
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function invalidateServerWakeCache() {
  lastWakeOkAt = 0
}

async function tryHealthOnce(healthUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)
  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    clearTimeout(timeout)
    return false
  }
}

export async function ensureServerWake() {
  if (Date.now() - lastWakeOkAt < WARM_CACHE_MS) return
  if (wakePromise) return wakePromise

  const healthUrl = resolveApiUrl('/api/health')

  wakePromise = (async () => {
    let firstFailure = true
    try {
      while (true) {
        if (await tryHealthOnce(healthUrl)) {
          lastWakeOkAt = Date.now()
          setServerWaking(false)
          return
        }
        if (firstFailure) {
          setServerWaking(true)
          firstFailure = false
        }
        await sleep(WAKE_RETRY_INTERVAL_MS)
      }
    } finally {
      wakePromise = null
    }
  })()

  return wakePromise
}

export async function apiFetch(input, init = {}) {
  await ensureServerWake()

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
  let res
  try {
    res = await fetch(url, { ...init, headers })
  } catch {
    invalidateServerWakeCache()
    throw new Error('Sin conexión con el servidor')
  }

  if ([502, 503, 504].includes(res.status)) {
    invalidateServerWakeCache()
  }

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
