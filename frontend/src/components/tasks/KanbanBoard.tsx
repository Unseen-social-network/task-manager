import { useMemo, useState } from 'react'
import { TaskCard } from '@/components/tasks/TaskCard'
import type { Task, TaskStatus, TaskStatusOption } from '@/types'
import { useLocale } from '@/contexts/localeContext'

interface KanbanBoardProps {
  tasks: Task[]
  statusOptions: TaskStatusOption[]
  onTaskSelect: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
}

const emptyColumn = (status: TaskStatusOption) => ({
  status,
  tasks: [] as Task[],
})

export const KanbanBoard = ({
  tasks,
  statusOptions,
  onTaskSelect,
  onStatusChange,
}: KanbanBoardProps) => {
  const { t } = useLocale()
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)

  const columns = useMemo(() => {
    const grouped = new Map<string, Task[]>(
      statusOptions.map(status => [status.key, []])
    )
    tasks.forEach(task => {
      const bucket = grouped.get(task.status)
      if (bucket) {
        bucket.push(task)
      }
    })
    return statusOptions.map(status => ({
      status,
      tasks: grouped.get(status.key) ?? emptyColumn(status).tasks,
      label: status.label,
    }))
  }, [statusOptions, tasks])

  const handleDrop = (status: TaskStatusOption, taskId: number | null) => {
    if (!taskId) return
    const task = tasks.find(item => item.id === taskId)
    if (!task || task.status === status.key) return
    onStatusChange(task, status.key)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map(column => (
        <div
          key={column.status.key}
          className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          onDragOver={event => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDrop={event => {
            event.preventDefault()
            const data = event.dataTransfer.getData('text/plain')
            handleDrop(column.status, data ? Number(data) : null)
            setDraggingTaskId(null)
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {column.label}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {column.tasks.length}
            </span>
          </div>
          <div className="flex-1 space-y-3 px-3 py-4">
            {column.tasks.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                {t('tasks.kanban.emptyColumn')}
              </div>
            ) : (
              column.tasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.setData('text/plain', String(task.id))
                    event.dataTransfer.effectAllowed = 'move'
                    setDraggingTaskId(task.id)
                  }}
                  onDragEnd={() => setDraggingTaskId(null)}
                  className={
                    draggingTaskId === task.id
                      ? 'opacity-60'
                      : 'opacity-100'
                  }
                >
                  <TaskCard task={task} onClick={() => onTaskSelect(task)} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
