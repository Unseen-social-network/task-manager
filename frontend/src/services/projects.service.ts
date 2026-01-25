import { api } from './api'
import type { CreateProjectInput, Project, PaginatedResponse } from '@/types'

const normalizeProject = (input: CreateProjectInput): CreateProjectInput => {
  const links =
    input.links?.filter(link => link.label.trim() || link.url.trim()).map(link => ({
      label: link.label.trim(),
      url: link.url.trim(),
    })) ?? []

  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    links,
  }
}

export const projectsService = {
  async getProjects(): Promise<PaginatedResponse<Project>> {
    const response = await api.get<PaginatedResponse<Project>>('/api/v1/projects/')
    return response.data
  },

  async getProject(id: number): Promise<Project> {
    const response = await api.get<Project>(`/api/v1/projects/${id}/`)
    return response.data
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const normalized = normalizeProject(input)
    const response = await api.post<Project>('/api/v1/projects/', normalized)
    return response.data
  },

  async updateProject(id: number, input: CreateProjectInput): Promise<Project> {
    const normalized = normalizeProject(input)
    const response = await api.patch<Project>(`/api/v1/projects/${id}/`, normalized)
    return response.data
  },

  async deleteProject(id: number): Promise<void> {
    await api.delete(`/api/v1/projects/${id}/`)
  },

  async createShare(id: number): Promise<{ share_url: string; copy_url: string }> {
    const response = await api.post(`/api/v1/projects/${id}/share/`)
    return response.data
  },

  async getSharedProject(token: string): Promise<Project> {
    const response = await api.get<Project>(`/api/v1/share/projects/${token}/`)
    return response.data
  },

  async copySharedProject(token: string): Promise<Project> {
    const response = await api.post<Project>(`/api/v1/share/projects/${token}/copy/`)
    return response.data
  },

  async acceptSharedProject(token: string): Promise<Project> {
    const response = await api.post<Project>(`/api/v1/share/projects/${token}/accept/`)
    return response.data
  },

  async getProjectAccess(projectId: number): Promise<
    Array<{ user_id: number; username: string; email: string; created_at: string }>
  > {
    const response = await api.get(`/api/v1/projects/${projectId}/access/`)
    return response.data
  },

  async revokeProjectAccess(projectId: number, userId?: number): Promise<void> {
    const params = userId ? { user_id: userId } : undefined
    await api.delete(`/api/v1/projects/${projectId}/access/`, { params })
  },
}
