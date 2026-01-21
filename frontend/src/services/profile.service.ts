import { api } from './api'
import type { PasswordChangeInput, Profile } from '@/types'

export const profileService = {
  async getProfile(): Promise<Profile> {
    const response = await api.get<Profile>('/api/v1/profile/')
    return response.data
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const response = await api.put<Profile>('/api/v1/profile/', data)
    return response.data
  },

  async changePassword(data: PasswordChangeInput): Promise<void> {
    await api.post('/api/v1/profile/password/', data)
  },
}
