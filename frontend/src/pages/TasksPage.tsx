import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { ManagerDashboard, type QuickFilter } from '@/components/tasks/ManagerDashboard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { profileService } from '@/services/profile.service'
import { projectsService } from '@/services/projects.service'
import { taskStatusesService } from '@/services/task-statuses.service'
import { tasksService } from '@/services/tasks.service'
import { useLocale } from '@/contexts/localeContext'
import {
  getTaskAssignee,
  isTaskAtRisk,
  isTaskBlocked,
  isTaskNeedsClarification,
  isTaskNeedsReview,
  isTaskOverdue,
} from '@/utils/taskInsights'
import type {
  Project,
  Task,
  CreateTaskInput,
  TaskFilters as TaskFiltersType,
  TaskStatus,
  TaskStatusOption,
  TaskView,
} from '@/types'

const MANAGER_VIEW_COOKIE = 'tasks_manager_view'

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null
  return (
    document.cookie
      .split('; ')
      .find(item => item.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? null
  )
}

const setCookieValue = (name: string, value: string, days = 365) => {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; samesite=lax`
}

export const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active')
  const [projects, setProjects] = useState<Project[]>([])
  const [searchEverywhere, setSearchEverywhere] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [isManagerView, setIsManagerView] = useState(() => {
    const stored = getCookieValue(MANAGER_VIEW_COOKIE)
    return stored === 'manager'
  })
  const [taskView, setTaskView] = useState<TaskView>('list')
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusOption[]>([])
  const taskViewInitialized = useRef(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLocale()
  const sharedTaskId = useMemo(() => {
    const param = searchParams.get('task')
    if (!param) return null
    const parsed = Number(param)
    return Number.isFinite(parsed) ? parsed : null
  }, [searchParams])

  const loadTasks = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true
    if (showLoading) {
      setIsLoading(true)
    }
    try {
      const response = await tasksService.getTasks(filters)
      setTasks(response.results)
    } catch {
      toast.error(t('tasks.loadFail'))
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [filters, t])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    let isActive = true
    const loadStatuses = async () => {
      try {
        const data = await taskStatusesService.getTaskStatuses()
        if (!isActive) return
        setTaskStatuses(data)
      } catch {
        if (!isActive) return
        setTaskStatuses([])
      }
    }
    loadStatuses()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadProfileDefaults = async () => {
      try {
        const profile = await profileService.getProfile()
        if (!isActive || taskViewInitialized.current) return
        taskViewInitialized.current = true
        setTaskView(profile.default_task_view ?? 'list')
      } catch {
        if (!isActive || taskViewInitialized.current) return
        taskViewInitialized.current = true
        setTaskView('list')
      }
    }
    loadProfileDefaults()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (taskView !== 'kanban') return
    const interval = window.setInterval(() => {
      loadTasks({ showLoading: false })
    }, 15000)
    return () => window.clearInterval(interval)
  }, [loadTasks, taskView])

  useEffect(() => {
    let isActive = true
    const loadProjects = async () => {
      try {
        const response = await projectsService.getProjects()
        if (!isActive) return
        setProjects(response.results)
      } catch {
        if (!isActive) return
        toast.error(t('projects.loadFail'))
      }
    }
    loadProjects()
    return () => {
      isActive = false
    }
  }, [t])

  useEffect(() => {
    if (searchEverywhere) return
    const allowedStatuses = tabStatusOptions.map(status => status.key) as TaskStatus[]
    if (filters.status && !allowedStatuses.includes(filters.status)) {
      setFilters(prev => ({
        ...prev,
        status: undefined,
      }))
    }
  }, [filters.status, searchEverywhere, tabStatusOptions])

  useEffect(() => {
    if (!filters.project) return
    const hasProject = projects.some(project => project.id === filters.project)
    if (!hasProject) {
      setFilters(prev => ({
        ...prev,
        project: undefined,
      }))
    }
  }, [filters.project, projects])

  useEffect(() => {
    setCookieValue(MANAGER_VIEW_COOKIE, isManagerView ? 'manager' : 'simple')
  }, [isManagerView])

  useEffect(() => {
    if (!sharedTaskId) return
    const existingTask = tasks.find(task => task.id === sharedTaskId)
    if (existingTask) {
      setSelectedTask(existingTask)
      setIsDetailsModalOpen(true)
      return
    }
    let isActive = true
    const loadSharedTask = async () => {
      try {
        const task = await tasksService.getTask(sharedTaskId)
        if (!isActive) return
        setSelectedTask(task)
        setIsDetailsModalOpen(true)
      } catch {
        if (!isActive) return
        toast.error(t('tasks.openFail'))
      }
    }
    loadSharedTask()
    return () => {
      isActive = false
    }
  }, [sharedTaskId, tasks, t])

  const updateTaskShareParam = (taskId: number | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (taskId) {
        next.set('task', String(taskId))
      } else {
        next.delete('task')
      }
      return next
    })
  }

  const handleCreateTask = async (data: CreateTaskInput) => {
    try {
      await tasksService.createTask(data)
      toast.success(t('tasks.createSuccess'))
      setIsCreateModalOpen(false)
      loadTasks()
    } catch {
      toast.error(t('tasks.createFail'))
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsModalOpen(true)
    updateTaskShareParam(task.id)
  }

  const handleTaskUpdate = () => {
    setIsDetailsModalOpen(false)
    updateTaskShareParam(null)
    loadTasks()
  }

  const handleTaskStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      const updatedTask = await tasksService.updateTask(task.id, { status })
      setTasks(prev =>
        prev.map(existing => (existing.id === updatedTask.id ? updatedTask : existing))
      )
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask)
      }
      toast.success(t('tasks.kanban.updateSuccess'))
    } catch {
      toast.error(t('tasks.kanban.updateFail'))
    }
  }

  const handleTaskRefresh = useCallback(async () => {
    if (!selectedTask) return
    try {
      const updatedTask = await tasksService.getTask(selectedTask.id)
      setSelectedTask(updatedTask)
      setTasks(prev =>
        prev.map(task => (task.id === updatedTask.id ? updatedTask : task))
      )
    } catch {
      toast.error(t('tasks.updateFail'))
    }
  }, [selectedTask, t])

  const handleTaskClose = () => {
    setIsDetailsModalOpen(false)
    updateTaskShareParam(null)
  }

  const statusOptions = useMemo<TaskStatusOption[]>(() => {
    if (!taskStatuses.length) {
      const fallback: TaskStatusOption[] = [
        { key: 'todo', label: t('status.todo'), order: 1, is_archived: false, is_done: false },
        { key: 'in_progress', label: t('status.in_progress'), order: 2, is_archived: false, is_done: false },
        { key: 'done', label: t('status.done'), order: 3, is_archived: true, is_done: true },
        { key: 'canceled', label: t('status.canceled'), order: 4, is_archived: true, is_done: false },
      ]
      return fallback
    }
    const sorted = [...taskStatuses].sort((a, b) => a.order - b.order)
    return sorted
  }, [taskStatuses, t])

  const tabStatusOptions = useMemo<TaskStatusOption[]>(() => {
    if (searchEverywhere) {
      return statusOptions
    }
    return statusOptions.filter(status => status.is_archived === (activeTab === 'archive'))
  }, [activeTab, searchEverywhere, statusOptions])

  const visibleTasks = useMemo(() => {
    const allowedStatuses = new Set(
      searchEverywhere ? [] : tabStatusOptions.map(status => status.key)
    )
    const baseTasks = searchEverywhere
      ? tasks
      : tasks.filter(task => allowedStatuses.has(task.status))
    const assigneeFiltered = assigneeFilter
      ? baseTasks.filter(
          task => getTaskAssignee(task, t('tasks.dashboard.unassigned')) === assigneeFilter
        )
      : baseTasks
    const quickFiltered = (() => {
      switch (quickFilter) {
        case 'overdue':
          return assigneeFiltered.filter(isTaskOverdue)
        case 'blocked':
          return assigneeFiltered.filter(isTaskBlocked)
        case 'needs_review':
          return assigneeFiltered.filter(isTaskNeedsReview)
        case 'at_risk':
          return assigneeFiltered.filter(isTaskAtRisk)
        case 'needs_clarification':
          return assigneeFiltered.filter(isTaskNeedsClarification)
        default:
          return assigneeFiltered
      }
    })()
    return quickFiltered
  }, [assigneeFilter, quickFilter, searchEverywhere, tabStatusOptions, t, tasks])

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('tasks.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{t('tasks.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Button
                size="sm"
                variant={taskView === 'list' ? 'primary' : 'secondary'}
                onClick={() => setTaskView('list')}
              >
                {t('tasks.view.list')}
              </Button>
              <Button
                size="sm"
                variant={taskView === 'kanban' ? 'primary' : 'secondary'}
                onClick={() => setTaskView('kanban')}
              >
                {t('tasks.view.kanban')}
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={() => setIsManagerView(prev => !prev)}
            >
              {isManagerView
                ? t('tasks.dashboard.toggle.simple')
                : t('tasks.dashboard.toggle.manager')}
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.new')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTab === 'active' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('active')}
          >
            {t('tasks.tabs.active')}
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'archive' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('archive')}
          >
            {t('tasks.tabs.archive')}
          </Button>
        </div>

        {isManagerView && (
          <ManagerDashboard
            tasks={tasks}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onTaskSelect={handleTaskClick}
          />
        )}

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          statusOptions={tabStatusOptions}
          projects={projects}
          searchEverywhere={searchEverywhere}
          onSearchEverywhereChange={setSearchEverywhere}
        />

        {/* Tasks */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">{t('tasks.loading')}</p>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">{t('tasks.empty')}</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              {t('tasks.emptyAction')}
            </Button>
          </div>
        ) : taskView === 'kanban' ? (
          <KanbanBoard
            tasks={visibleTasks}
            statusOptions={statusOptions}
            onTaskSelect={handleTaskClick}
            onStatusChange={handleTaskStatusChange}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('tasks.createTitle')}
      >
        <TaskForm
          statusOptions={statusOptions}
          onSubmit={handleCreateTask}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsModalOpen}
          onClose={handleTaskClose}
          onUpdate={handleTaskUpdate}
          onRefresh={handleTaskRefresh}
          statusOptions={statusOptions}
        />
      )}
    </Layout>
  )
}
