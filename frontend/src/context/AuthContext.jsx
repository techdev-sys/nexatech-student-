import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'
import { authRef } from '../lib/authRef'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = async () => {
    await api.post('/api/logout').catch(() => {})
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  // Register logout so the axios interceptor can call it without a React import
  useEffect(() => {
    authRef.logout = logout
    return () => { authRef.logout = null }
  }, [])                                   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      api.get('/api/me')
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/login', { email, password })
    localStorage.setItem('auth_token', data.token)
    setUser(data.user)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
