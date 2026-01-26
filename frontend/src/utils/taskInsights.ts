import { differenceInCalendarDays, isBefore, parseISO, startOfDay } from 'date-fns'
import type { Task } from '@/types'

const BLOCKED_KEYWORDS = ['blocked', 'dependency', 'waiting', 'stuck']
const REVIEW_KEYWORDS = ['review', 'approval', 'feedback', 'sign-off']

export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date) return false
  if (task.status === 'done' || task.status === 'canceled') return false
  const today = startOfDay(new Date())
  return isBefore(parseISO(task.due_date), today)
}

export const isTaskDueSoon = (task: Task, windowDays = 3): boolean => {
  if (!task.due_date) return false
  if (task.status === 'done' || task.status === 'canceled') return false
  const today = startOfDay(new Date())
  const diff = differenceInCalendarDays(parseISO(task.due_date), today)
  return diff >= 0 && diff <= windowDays
}

export const isTaskAtRisk = (task: Task): boolean => {
  if (isTaskOverdue(task)) return true
  if (task.urgency === 'high' || task.urgency === 'critical') {
    return isTaskDueSoon(task)
  }
  return false
}

export const isTaskBlocked = (task: Task): boolean => {
  const haystack = `${task.title} ${task.description}`.toLowerCase()
  return BLOCKED_KEYWORDS.some(keyword => haystack.includes(keyword))
}

export const isTaskNeedsReview = (task: Task): boolean => {
  const haystack = `${task.title} ${task.description}`.toLowerCase()
  return REVIEW_KEYWORDS.some(keyword => haystack.includes(keyword))
}

export const getTaskAssignee = (task: Task, fallbackLabel = 'Unassigned'): string => {
  const primaryTagged =
    task.tagged_users?.find(user => user.trim().length > 0) ?? task.tagged_user
  return primaryTagged?.trim() || fallbackLabel
}
