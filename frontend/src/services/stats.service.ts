import { api } from './api'
import type { TaskStatsFilters, TaskStatsResponse } from '@/types'
import type { Locale } from '@/utils/translations'

const buildParams = (filters?: TaskStatsFilters) => {
  const params = new URLSearchParams()
  if (!filters) return params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  })
  return params
}

export const statsService = {
  async getTaskStats(filters?: TaskStatsFilters): Promise<TaskStatsResponse> {
    const params = buildParams(filters)
    const response = await api.get<TaskStatsResponse>('/api/v1/tasks/statistics/', {
      params,
    })
    return response.data
  },

  async exportTaskStats(filters?: TaskStatsFilters, locale?: Locale): Promise<void> {
    const params = buildParams(filters)
    if (locale) {
      params.append('lang', locale)
    }
    const response = await api.get<Blob>('/api/v1/tasks/export/', {
      params,
      responseType: 'blob',
    })
    const blob = new Blob([response.data], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `task-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
