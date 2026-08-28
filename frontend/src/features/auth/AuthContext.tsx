import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiRequest, clearToken, getToken, setToken } from '../../lib/api-client'
import type { User } from '../../types'
import { AuthContext, type AuthStatus } from './auth-context'

interface LoginResponse {
  accessToken: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (!getToken()) {
      return
    }

    apiRequest<User>('/auth/me')
      .then((me) => {
        setUser(me)
        setStatus('ready')
      })
      .catch(() => {
        // apiRequest ya limpió el token y redirige a /login si hacía falta.
        setUser(null)
        setStatus('ready')
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      setToken(response.accessToken)
      setUser(response.user)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(0, 'No se pudo conectar con el servidor')
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
