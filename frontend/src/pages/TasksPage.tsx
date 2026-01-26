import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ManagerDashboard, type QuickFilter } from '@/components/tasks/ManagerDashboard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { projectsService } from '@/services/projects.service'
import { tasksService } from '@/services/tasks.service'
import { useLocale } from '@/contexts/localeContext'
import {
  getTaskAssignee,
  isTaskAtRisk,
  isTaskBlocked,
  isTaskNeedsReview,
  isTaskOverdue,
} from '@/utils/taskInsights'
import type {
  Project,
  Task,
  CreateTaskInput,
  TaskFilters as TaskFiltersType,
  TaskStatus,
} from '@/types'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLocale()
  const sharedTaskId = useMemo(() => {
    const param = searchParams.get('task')
    if (!param) return null
    const parsed = Number(param)
    return Number.isFinite(parsed) ? parsed : null
  }, [searchParams])

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await tasksService.getTasks(filters)
      setTasks(response.results)
    } catch {
      toast.error(t('tasks.loadFail'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, t])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

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
    const allowedStatuses: TaskStatus[] =
      activeTab === 'archive' ? ['done', 'canceled'] : ['todo', 'in_progress']
    if (filters.status && !allowedStatuses.includes(filters.status)) {
      setFilters(prev => ({
        ...prev,
        status: undefined,
      }))
    }
  }, [activeTab, filters.status, searchEverywhere])

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

  const visibleTasks = useMemo(() => {
    const baseTasks = searchEverywhere
      ? tasks
      : tasks.filter(task =>
          (activeTab === 'archive'
            ? ['done', 'canceled']
            : ['todo', 'in_progress']
          ).includes(task.status)
        )
    const assigneeFiltered = assigneeFilter
      ? baseTasks.filter(task => getTaskAssignee(task) === assigneeFilter)
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
        default:
          return assigneeFiltered
      }
    })()
    return quickFiltered
  }, [activeTab, assigneeFilter, quickFilter, searchEverywhere, tasks])

  const statusOptions = useMemo<TaskStatus[]>(
    () =>
      searchEverywhere
        ? ['todo', 'in_progress', 'done', 'canceled']
        : activeTab === 'archive'
          ? ['done', 'canceled']
          : ['todo', 'in_progress'],
    [activeTab, searchEverywhere]
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('tasks.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{t('tasks.subtitle')}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('tasks.new')}
          </Button>
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

        <ManagerDashboard
          tasks={tasks}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
        />

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          statusOptions={statusOptions}
          projects={projects}
          searchEverywhere={searchEverywhere}
          onSearchEverywhereChange={setSearchEverywhere}
        />

        {/* Tasks List */}
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
        />
      )}
    </Layout>
  )
}
