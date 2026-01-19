import { format, parseISO } from 'date-fns'
import type { TaskUrgency, TaskStatus } from '@/types'

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), 'MMM d, yyyy HH:mm')
  } catch {
    return dateString
  }
}

export const formatDateOnly = (dateString: string | null): string => {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

export const getUrgencyColor = (urgency: TaskUrgency): string => {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }
  return colors[urgency] || colors.medium
}

export const getStatusColor = (status: TaskStatus): string => {
  const colors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
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

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}
