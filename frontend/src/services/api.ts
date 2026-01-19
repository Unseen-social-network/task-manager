import axios from 'axios'
import type { AuthTokens } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const tokens = getStoredTokens()
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const tokens = getStoredTokens()
        if (tokens?.refresh) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/jwt/refresh/`, {
            refresh: tokens.refresh,
          })

          const newTokens: AuthTokens = {
            access: response.data.access,
            refresh: tokens.refresh,
          }

          storeTokens(newTokens)

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Token management helpers
export const getStoredTokens = (): AuthTokens | null => {
  const tokensStr = localStorage.getItem('auth_tokens')
  if (!tokensStr) return null
  try {
    return JSON.parse(tokensStr)
  } catch {
    return null
  }
}

export const storeTokens = (tokens: AuthTokens): void => {
  localStorage.setItem('auth_tokens', JSON.stringify(tokens))
}

export const clearTokens = (): void => {
  localStorage.removeItem('auth_tokens')
}

export const isAuthenticated = (): boolean => {
  const tokens = getStoredTokens()
  return !!tokens?.access
}
