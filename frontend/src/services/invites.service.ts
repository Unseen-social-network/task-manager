import { api } from './api'
import type {
  Invite,
  InviteAcceptInput,
  InviteCreateInput,
  PaginatedResponse,
} from '@/types'

export const invitesService = {
  async listInvites(): Promise<PaginatedResponse<Invite>> {
    const response = await api.get<PaginatedResponse<Invite>>('/api/v1/invites/')
    return response.data
  },

  async createInvite(data: InviteCreateInput): Promise<void> {
    await api.post('/api/v1/invites/', data)
  },

  async revokeInvite(inviteId: number): Promise<void> {
    await api.delete(`/api/v1/invites/${inviteId}/`)
  },

  async getInvite(token: string): Promise<Invite> {
    const response = await api.get<Invite>(`/api/v1/invites/accept/${token}/`)
    return response.data
  },

  async acceptInvite(token: string, data: InviteAcceptInput): Promise<void> {
    await api.post(`/api/v1/invites/accept/${token}/`, data)
  },
}
