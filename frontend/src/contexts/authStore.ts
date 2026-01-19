import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import { getStoredTokens } from '@/services/api'
import type { LoginCredentials } from '@/types'

interface AuthState {
  username: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

const USERNAME_STORAGE_KEY = 'auth_username'

export const useAuthStore = create<AuthState>((set) => ({
  username: localStorage.getItem(USERNAME_STORAGE_KEY),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null })
    try {
      await authService.login(credentials)
      localStorage.setItem(USERNAME_STORAGE_KEY, credentials.username)
      set({
        username: credentials.username,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  logout: () => {
    authService.logout()
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    set({ username: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const tokens = getStoredTokens()
    set({
      isAuthenticated: !!tokens?.access,
      username: localStorage.getItem(USERNAME_STORAGE_KEY),
    })
  },
}))
