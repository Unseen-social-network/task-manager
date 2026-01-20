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
  name: string
  description: string
  phone: string
  links: ProjectLink[]
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
  company: string
  phone: string
  email: string
  telegram: string
  other?: Record<string, string> | null
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateContactInput {
  name: string
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
  contact_freeform: string
  attachments: Attachment[]
  project_id?: number | null
  project_name?: string
  tagged_user?: string
  time_spent_seconds?: number
  tracking_completed?: boolean
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
  contact_freeform?: string
  project_id?: number | null
  tagged_user?: string
}

export type UpdateTaskInput = Partial<CreateTaskInput>

export interface TaskMeta {
  project_id?: number | null
  tagged_user?: string
  time_spent_seconds?: number
  tracking_completed?: boolean
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
  search?: string
  ordering?: string
  page?: number
}

export interface ContactFilters {
  company?: string
  search?: string
  ordering?: string
  page?: number
}
