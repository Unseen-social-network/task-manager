import { api } from './api'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  PaginatedResponse,
  TaskFilters,
  TaskComment,
  CreateTaskCommentInput,
} from '@/types'

type TaskApi = Omit<Task, 'project_id'> & {
  project: number | null
}

const mapTaskFromApi = (task: TaskApi): Task => {
  const { project, ...rest } = task
  return {
    ...rest,
    project_id: project,
  }
}

const mapTaskInput = (data: CreateTaskInput | UpdateTaskInput) => {
  const { project_id, ...rest } = data
  const payload: Record<string, unknown> = { ...rest }
  if (project_id !== undefined) {
    payload.project = typeof project_id === 'number' ? project_id : null
  }
  return payload
}

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

    const response = await api.get<PaginatedResponse<TaskApi>>('/api/v1/tasks/', { params })
    return {
      ...response.data,
      results: response.data.results.map(mapTaskFromApi),
    }
  },

  async getTask(id: number): Promise<Task> {
    const response = await api.get<TaskApi>(`/api/v1/tasks/${id}/`)
    return mapTaskFromApi(response.data)
  },

  async createTask(data: CreateTaskInput): Promise<Task> {
    const response = await api.post<TaskApi>('/api/v1/tasks/', mapTaskInput(data))
    return mapTaskFromApi(response.data)
  },

  async updateTask(id: number, data: UpdateTaskInput): Promise<Task> {
    const response = await api.patch<TaskApi>(`/api/v1/tasks/${id}/`, mapTaskInput(data))
    return mapTaskFromApi(response.data)
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

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const response = await api.get<TaskComment[]>(`/api/v1/tasks/${taskId}/comments/`)
    return response.data
  },

  async createTaskComment(
    taskId: number,
    data: CreateTaskCommentInput
  ): Promise<TaskComment> {
    const response = await api.post<TaskComment>(`/api/v1/tasks/${taskId}/comments/`, data)
    return response.data
  },
}
