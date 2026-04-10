const KEY = 'tracker_auth_token'

export function getToken() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  if (token) localStorage.setItem(KEY, token)
  else localStorage.removeItem(KEY)
}

export function clearToken() {
  localStorage.removeItem(KEY)
}
