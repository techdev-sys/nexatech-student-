import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'
import { authRef } from '../lib/authRef'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(() => localStorage.getItem('auth_session') === '1')

  const logout = async () => {
    await api.post('/api/logout').catch(() => {})
    localStorage.removeItem('auth_session')
    setUser(null)
  }

  // Register logout so the axios interceptor can call it without a React import
  useEffect(() => {
    authRef.logout = logout
    return () => { authRef.logout = null }
  }, [])

  useEffect(() => {
    const hasSession = localStorage.getItem('auth_session') === '1'
    if (hasSession) {
      api.get('/api/me')
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem('auth_session'))
        .finally(() => setLoading(false))
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/login', { email, password })
    localStorage.setItem('auth_session', '1')
    setUser(data.user)
    return data
  }

  const redeemDemo = async (email, accessCode, role) => {
    const { data } = await api.post('/api/demo/redeem', {
      email,
      access_code: accessCode,
      role,
    })
    localStorage.setItem('auth_session', '1')
    setUser(data.user)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, redeemDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Context hooks intentionally live beside their provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
