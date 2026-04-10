import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getToken } from '../api/authStorage.js'
import { fetchMe, loginRequest, logoutClient, registerRequest } from '../api/authClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { user: nextUser } = await fetchMe()
      setUser(nextUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const login = useCallback(async (email, password) => {
    const { user: nextUser } = await loginRequest(email, password)
    setUser(nextUser)
  }, [])

  const register = useCallback(async (email, password) => {
    const { user: nextUser } = await registerRequest(email, password)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    logoutClient()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshAuth,
    }),
    [user, loading, login, register, logout, refreshAuth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
