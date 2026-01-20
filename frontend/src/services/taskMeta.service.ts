import type { TaskMeta } from '@/types'

const STORAGE_KEY = 'task_meta_data'

type TaskMetaStore = Record<number, TaskMeta>

const loadMeta = (): TaskMetaStore => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as TaskMetaStore
  } catch {
    return {}
  }
}

const saveMeta = (data: TaskMetaStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const taskMetaService = {
  getTaskMeta(taskId: number): TaskMeta {
    const data = loadMeta()
    return data[taskId] ?? {}
  },

  setTaskMeta(taskId: number, updates: TaskMeta): TaskMeta {
    const data = loadMeta()
    const next = {
      ...data[taskId],
      ...updates,
    }
    const updated = {
      ...data,
      [taskId]: next,
    }
    saveMeta(updated)
    return next
  },

  deleteTaskMeta(taskId: number): void {
    const data = loadMeta()
    if (!data[taskId]) return
    const next = { ...data }
    delete next[taskId]
    saveMeta(next)
  },
}
