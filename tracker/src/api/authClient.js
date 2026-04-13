import { apiFetch } from './http.js'
import { setToken, clearToken } from './authStorage.js'

async function postAuthJson(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || `Error ${res.status}`)
  setToken(payload.token)
  return payload
}

export async function registerRequest(email, password) {
  return postAuthJson('/api/auth/register', { email, password })
}

export async function loginRequest(email, password) {
  return postAuthJson('/api/auth/login', { email, password })
}

export async function requestPasswordReset(email) {
  const t0 = performance.now()
  console.log('[requestPasswordReset] enviando', { email, t0 })
  const res = await apiFetch('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const payload = await res.json().catch(() => ({}))
  console.log('[requestPasswordReset] respuesta', {
    status: res.status,
    ok: res.ok,
    ms: Math.round(performance.now() - t0),
    payload,
  })
  if (!res.ok) throw new Error(payload.error || `Error ${res.status}`)
  return payload
}

export async function verifyPasswordResetCode(email, code) {
  const res = await apiFetch('/api/auth/password-reset/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || `Error ${res.status}`)
  return payload
}

export async function confirmPasswordReset(email, code, newPassword) {
  return postAuthJson('/api/auth/password-reset/confirm', {
    email,
    code,
    newPassword,
  })
}

export async function changePassword(currentPassword, newPassword) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || `Error ${res.status}`)
  return payload
}

export async function fetchMe() {
  const res = await apiFetch('/api/auth/me')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body
}

export function logoutClient() {
  clearToken()
}
