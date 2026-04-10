import { apiFetch } from './http.js'

const BASE = '/api/settings'

async function parseOkJson(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || `Error ${res.status}`)
  }
  return body
}

export async function getSetting(key) {
  const res = await apiFetch(`${BASE}/${key}`)
  return parseOkJson(res)
}

export async function putSetting(key, data) {
  const res = await apiFetch(`${BASE}/${key}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return parseOkJson(res)
}
