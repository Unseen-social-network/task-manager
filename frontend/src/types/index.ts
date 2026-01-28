export interface User {
  id: number
  username: string
  email: string
}

export interface ProjectLink {
  label: string
  url: string
}

export interface Project {
  id: number
  owner?: number
  name: string
  description: string
  phone: string
  links: ProjectLink[]
  is_owner?: boolean
  created_at: string
  updated_at: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  phone?: string
  links?: ProjectLink[]
}

export interface Contact {
  id: number
  owner?: number
  name: string
  username: string
  company: string
  phone: string
  email: string
  telegram: string
  other?: Record<string, string> | null
  notes: string
  is_owner?: boolean
  created_at: string
  updated_at: string
}

export interface CreateContactInput {
  name: string
  username?: string
  company?: string
  phone?: string
  email?: string
  telegram?: string
  other?: Record<string, string> | null
  notes?: string
}

export type UpdateContactInput = Partial<CreateContactInput>

export type TaskUrgency = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled'

export interface Task {
  id: number
  owner?: number
  title: string
  description: string
  urgency: TaskUrgency
  due_date: string | null
  status: TaskStatus
  contact: number | null
  contact_name?: string
  contacts?: number[]
  contact_names?: string[]
  contact_freeform: string
  attachments: Attachment[]
  project_id?: number | null
  project_name?: string
  tagged_user?: string
  tagged_users?: string[]
  time_spent_seconds?: number
  tracking_completed?: boolean
  pomodoro_sessions?: number
  has_question?: boolean
  completion_requested?: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  urgency?: TaskUrgency
  due_date?: string | null
  status?: TaskStatus
  contact?: number | null
  contacts?: number[]
  contact_freeform?: string
  project_id?: number | null
  tagged_user?: string
  tagged_users?: string[]
  time_spent_seconds?: number
  tracking_completed?: boolean
  pomodoro_sessions?: number
  has_question?: boolean
  completion_requested?: boolean
}

export type UpdateTaskInput = Partial<CreateTaskInput>

export interface TaskMeta {
  project_id?: number | null
  tagged_user?: string
  tagged_users?: string[]
  time_spent_seconds?: number
  tracking_completed?: boolean
  pomodoro_sessions?: number
  has_question?: boolean
  completion_requested?: boolean
}

export interface TaskComment {
  id: number
  task: number
  parent: number | null
  author: number
  author_username: string
  body: string
  created_at: string
  updated_at: string
}

export interface CreateTaskCommentInput {
  body: string
  parent?: number | null
}

export interface Attachment {
  id: number
  owner?: number
  task: number
  file: string
  file_url: string
  original_name: string
  size: number
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface Profile {
  username: string
  full_name: string
  self_contact_id?: number | null
  telegram_chat_id?: number | null
  telegram_username: string
  telegram_link_url?: string | null
  telegram_connected?: boolean
  telegram_notifications_enabled?: boolean
  telegram_notify_on_tag?: boolean
  share_invite_contact?: boolean
  invite_quota: number
  invites_remaining: number
  inviter_username?: string | null
}

export interface PasswordChangeInput {
  old_password: string
  new_password: string
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface Invite {
  id: number
  email: string
  status: InviteStatus
  token: string
  invited_at: string
  accepted_at: string | null
  revoked_at: string | null
  invited_by_username: string
  invited_by_full_name: string
  invited_user_username?: string | null
}

export interface InviteCreateInput {
  email: string
}

export interface InviteAcceptInput {
  username: string
  full_name: string
  password: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface TaskFilters {
  status?: TaskStatus
  urgency?: TaskUrgency
  due_date_from?: string
  due_date_to?: string
  created_at_from?: string
  created_at_to?: string
  contact?: number
  project?: number
  tagged_user?: string
  tagged_user_id?: number
  tagged_users?: number
  search?: string
  search_in_description?: boolean
  ordering?: string
  page?: number
}

export interface TaskStatsFilters {
  status?: TaskStatus
  urgency?: TaskUrgency
  due_date_from?: string
  due_date_to?: string
  project?: number
  tagged_user?: string
}

export interface TaskStatsMetrics {
  total: number
  completed: number
  completion_rate: number
  overdue: number
  avg_completion_seconds: number
}

export interface TaskStatsSeries {
  by_status: Array<{ status: TaskStatus; count: number }>
  by_urgency: Array<{ urgency: TaskUrgency; count: number }>
  by_assignee: Array<{
    assignee_id: number | null
    assignee_name: string
    total: number
    done: number
    overdue: number
  }>
  due_date_trend: Array<{ date: string; count: number }>
}

export interface TaskStatsResponse {
  metrics: TaskStatsMetrics
  series: TaskStatsSeries
}

export interface ContactFilters {
  company?: string
  search?: string
  ordering?: string
  page?: number
}

export interface SiteSetting {
  head_html: string
  updated_at: string
}
