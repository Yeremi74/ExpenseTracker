import { guardedFetch } from './backendWake.js'
import { resolveApiUrl } from './apiUrl.js'

let getToken = () => null
let onUnauthorized = null

export function setTokenGetter(fn) {
  getToken = fn
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export async function apiFetch(input, init = {}) {
  return guardedFetch(async () => {
    const headers = new Headers(init.headers || {})
    if (
      init.body != null &&
      typeof init.body === 'string' &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json')
    }

    const token = getToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const url = resolveApiUrl(input)
    const res = await fetch(url, { ...init, headers })

    if (res.status === 401 && !String(url).includes('/api/auth/')) {
      onUnauthorized?.()
    }

    return res
  })
}
