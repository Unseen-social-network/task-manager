import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import { getStoredTokens } from '@/services/api'
import type { LoginCredentials, User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null })
    try {
      await authService.login(credentials)
      set({ isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  logout: () => {
    authService.logout()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const tokens = getStoredTokens()
    set({ isAuthenticated: !!tokens?.access })
  },
}))
