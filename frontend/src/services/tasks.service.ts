import { api } from './api'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  PaginatedResponse,
  TaskFilters,
} from '@/types'

export const tasksService = {
  async getTasks(filters?: TaskFilters): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }

    const response = await api.get<PaginatedResponse<Task>>('/api/v1/tasks/', { params })
    return response.data
  },

  async getTask(id: number): Promise<Task> {
    const response = await api.get<Task>(`/api/v1/tasks/${id}/`)
    return response.data
  },

  async createTask(data: CreateTaskInput): Promise<Task> {
    const response = await api.post<Task>('/api/v1/tasks/', data)
    return response.data
  },

  async updateTask(id: number, data: UpdateTaskInput): Promise<Task> {
    const response = await api.patch<Task>(`/api/v1/tasks/${id}/`, data)
    return response.data
  },

  async deleteTask(id: number): Promise<void> {
    await api.delete(`/api/v1/tasks/${id}/`)
  },

  async uploadAttachment(taskId: number, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)

    await api.post(`/api/v1/tasks/${taskId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    await api.delete(`/api/v1/attachments/${attachmentId}/`)
  },
}
