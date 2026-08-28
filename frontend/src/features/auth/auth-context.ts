import { createContext } from 'react'
import type { User } from '../../types'

export type AuthStatus = 'loading' | 'ready'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
