import { api } from './api'
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  PaginatedResponse,
  ContactFilters,
} from '@/types'

export const contactsService = {
  async getContacts(filters?: ContactFilters): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }

    const response = await api.get<PaginatedResponse<Contact>>('/api/v1/contacts/', { params })
    return response.data
  },

  async getContact(id: number): Promise<Contact> {
    const response = await api.get<Contact>(`/api/v1/contacts/${id}/`)
    return response.data
  },

  async createContact(data: CreateContactInput): Promise<Contact> {
    const response = await api.post<Contact>('/api/v1/contacts/', data)
    return response.data
  },

  async updateContact(id: number, data: UpdateContactInput): Promise<Contact> {
    const response = await api.patch<Contact>(`/api/v1/contacts/${id}/`, data)
    return response.data
  },

  async deleteContact(id: number): Promise<void> {
    await api.delete(`/api/v1/contacts/${id}/`)
  },

  async createShare(id: number): Promise<{ share_url: string; copy_url: string }> {
    const response = await api.post(`/api/v1/contacts/${id}/share/`)
    return response.data
  },

  async getSharedContact(token: string): Promise<Contact> {
    const response = await api.get<Contact>(`/api/v1/share/contacts/${token}/`)
    return response.data
  },

  async copySharedContact(token: string): Promise<Contact> {
    const response = await api.post<Contact>(`/api/v1/share/contacts/${token}/copy/`)
    return response.data
  },
}
