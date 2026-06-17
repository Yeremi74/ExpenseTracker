import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as apiLogin, register as apiRegister, snapshotExchangeRates } from '../api/api.js'
import { setTokenGetter, setUnauthorizedHandler } from '../api/http.js'
import { todayInputDate } from '../utils/format.js'

const TOKEN_KEY = 'tracker_token'

const AuthContext = createContext(null)

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(readStoredToken()))

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    storeToken(null)
  }, [])

  useEffect(() => {
    setTokenGetter(() => token)
  }, [token])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
    })
  }, [logout])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)

    getMe()
      .then((data) => {
        if (!cancelled) {
          setUser(data.user)
          const today = todayInputDate()
          const sessionKey = `rates_snapshot_${today}`
          if (!sessionStorage.getItem(sessionKey)) {
            snapshotExchangeRates()
              .then(() => sessionStorage.setItem(sessionKey, '1'))
              .catch(() => {})
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout()
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, logout])

  const login = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password })
    storeToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password, name) => {
    const data = await apiRegister({ email, password, name })
    storeToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
