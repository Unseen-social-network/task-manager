import { api, storeTokens, clearTokens } from './api'
import type { AuthTokens, LoginCredentials } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/api/v1/auth/jwt/create/', credentials)
    storeTokens(response.data)
    return response.data
  },

  async refreshToken(refresh: string): Promise<{ access: string }> {
    const response = await api.post<{ access: string }>('/api/v1/auth/jwt/refresh/', {
      refresh,
    })
    return response.data
  },

  logout(): void {
    clearTokens()
  },
}
