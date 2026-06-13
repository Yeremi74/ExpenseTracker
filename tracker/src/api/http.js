import { guardedFetch } from './backendWake.js'
import { resolveApiUrl } from './apiUrl.js'

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

    const url = resolveApiUrl(input)
    const res = await fetch(url, { ...init, headers })
    return res
  })
}
