import type { TaskMeta } from '@/types'

const STORAGE_KEY = 'task_meta_data'

type TaskMetaStore = Record<number, TaskMeta>

const getUserKey = (userKey?: string | null): string => {
  const normalized = userKey?.trim()
  return normalized ? normalized : 'anonymous'
}

const getStorageKey = (userKey?: string | null): string => {
  return `${STORAGE_KEY}:${getUserKey(userKey)}`
}

const loadMeta = (storageKey: string): TaskMetaStore => {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as TaskMetaStore
  } catch {
    return {}
  }
}

const saveMeta = (storageKey: string, data: TaskMetaStore) => {
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export const taskMetaService = {
  getTaskMeta(taskId: number, userKey?: string | null): TaskMeta {
    const storageKey = getStorageKey(userKey)
    const data = loadMeta(storageKey)
    if (data[taskId]) {
      return data[taskId]
    }
    const legacyData = loadMeta(STORAGE_KEY)
    if (legacyData[taskId]) {
      const next = {
        ...data,
        [taskId]: legacyData[taskId],
      }
      saveMeta(storageKey, next)
      return legacyData[taskId]
    }
    return {}
  },

  setTaskMeta(taskId: number, updates: TaskMeta, userKey?: string | null): TaskMeta {
    const storageKey = getStorageKey(userKey)
    const data = loadMeta(storageKey)
    const next = {
      ...data[taskId],
      ...updates,
    }
    const updated = {
      ...data,
      [taskId]: next,
    }
    saveMeta(storageKey, updated)
    return next
  },

  deleteTaskMeta(taskId: number, userKey?: string | null): void {
    const storageKey = getStorageKey(userKey)
    const data = loadMeta(storageKey)
    if (!data[taskId]) return
    const next = { ...data }
    delete next[taskId]
    saveMeta(storageKey, next)
  },
}
