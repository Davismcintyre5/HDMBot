import { createContext, useState, useEffect, useCallback } from 'react'
import { getMe, login as loginApi, logout as logoutApi } from '../api/auth'

export const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      setUser(null)
      return
    }
    try {
      const { data } = await getMe()
      const userData = data?.data || data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async ({ email, password }) => {
    const { data } = await loginApi({ email, password })
    const payload = data?.data || data
    localStorage.setItem('token', payload.token)
    localStorage.setItem('user', JSON.stringify(payload.user))
    setUser(payload.user)
    return payload.user
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...partial } : prev
      if (next) localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}