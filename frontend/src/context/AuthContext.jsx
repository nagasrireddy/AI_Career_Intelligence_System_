import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TOKEN_KEY } from '../api/client'
import { authApi } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))
  const [expired, setExpired] = useState(false)

  const refreshUser = useCallback(async () => {
    const me = await authApi.me()
    setUser(me)
    return me
  }, [])

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    refreshUser().catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false))
  }, [refreshUser])

  useEffect(() => {
    const onExpired = () => { setUser(null); setExpired(true) }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token } = await authApi.login({ email, password })
    localStorage.setItem(TOKEN_KEY, access_token)
    setExpired(false)
    return refreshUser()
  }, [refreshUser])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setExpired(false)
  }, [])

  const value = useMemo(() => ({ user, loading, expired, login, logout, refreshUser, setUser }), [user, loading, expired, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
