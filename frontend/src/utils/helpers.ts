import { format, parseISO } from 'date-fns'
import { isAxiosError } from 'axios'
import type { TaskUrgency, TaskStatus } from '@/types'

type ApiErrorData = {
  detail?: string
  non_field_errors?: string[]
  [key: string]: unknown
}

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm')
  } catch {
    return dateString
  }
}

export const formatDateOnly = (dateString: string | null): string => {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), 'dd.MM.yyyy')
  } catch {
    return dateString
  }
}

export const getUrgencyColor = (urgency: TaskUrgency): string => {
  const colors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
  }
  return colors[urgency] || colors.medium
}

export const getUrgencyBorder = (urgency: TaskUrgency): string => {
  const colors = {
    low: 'border-l-gray-200 dark:border-l-gray-700',
    medium: 'border-l-blue-400 dark:border-l-blue-500',
    high: 'border-l-orange-400 dark:border-l-orange-500',
    critical: 'border-l-red-500 dark:border-l-red-600',
  }
  return colors[urgency] || colors.medium
}

export const getStatusColor = (status: TaskStatus): string => {
  const colors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
  }
  return colors[status] || colors.todo
}

export const getUrgencyLabel = (urgency: TaskUrgency): string => {
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }
  return labels[urgency] || urgency
}

export const getStatusLabel = (status: TaskStatus): string => {
  const labels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    canceled: 'Canceled',
  }
  return labels[status] || status
}

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export const formatDuration = (totalSeconds: number): string => {
  const clampedSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(clampedSeconds / 3600)
  const minutes = Math.floor((clampedSeconds % 3600) / 60)
  const seconds = clampedSeconds % 60

  const parts = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].filter(Boolean) as string[]

  return parts.join(':')
}

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

const extractApiErrorMessage = (data: ApiErrorData | string | undefined): string | null => {
  if (!data) return null
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.non_field_errors?.length) return data.non_field_errors[0]

  for (const value of Object.values(data)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && value.length > 0) {
      const firstEntry = value[0]
      if (typeof firstEntry === 'string') return firstEntry
    }
  }

  return null
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError<ApiErrorData>(error)) {
    return extractApiErrorMessage(error.response?.data) ?? fallback
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
