import { api } from './api'
import type { SiteSetting } from '@/types'

export const siteSettingsService = {
  async getSiteSettings(): Promise<SiteSetting> {
    const response = await api.get<SiteSetting>('/api/v1/site-settings/')
    return response.data
  },
}
