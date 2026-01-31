import { api } from './api'
import type { TaskStatusOption } from '@/types'

export const taskStatusesService = {
  async getTaskStatuses(): Promise<TaskStatusOption[]> {
    const response = await api.get<TaskStatusOption[]>('/api/v1/task-statuses/')
    return response.data
  },
}
