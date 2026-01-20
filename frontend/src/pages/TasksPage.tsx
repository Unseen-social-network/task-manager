import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { tasksService } from '@/services/tasks.service'
import { taskMetaService } from '@/services/taskMeta.service'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'
import type { Task, CreateTaskInput, TaskFilters as TaskFiltersType } from '@/types'

export const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const { t } = useLocale()

  const enrichTasks = useCallback((items: Task[]) => {
    const projects = projectsService.getProjects()
    const projectMap = new Map(projects.map(project => [project.id, project.name]))
    return items.map(task => {
      const meta = taskMetaService.getTaskMeta(task.id)
      const projectId = meta.project_id ?? task.project_id ?? null
      const projectName = projectId ? projectMap.get(projectId) : undefined
      return {
        ...task,
        ...meta,
        project_id: projectId,
        project_name: projectName ?? task.project_name,
      }
    })
  }, [])

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await tasksService.getTasks(filters)
      setTasks(enrichTasks(response.results))
    } catch (error) {
      toast.error(t('tasks.loadFail'))
    } finally {
      setIsLoading(false)
    }
  }, [enrichTasks, filters, t])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleCreateTask = async (data: CreateTaskInput) => {
    try {
      const { project_id, tagged_user, ...payload } = data
      const normalizedProjectId =
        typeof project_id === 'number' && Number.isFinite(project_id) ? project_id : null
      const created = await tasksService.createTask({ ...payload, tagged_user })
      taskMetaService.setTaskMeta(created.id, {
        project_id: normalizedProjectId ?? null,
        tagged_user,
      })
      toast.success(t('tasks.createSuccess'))
      setIsCreateModalOpen(false)
      loadTasks()
    } catch (error) {
      toast.error(t('tasks.createFail'))
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsModalOpen(true)
  }

  const handleTaskUpdate = () => {
    setIsDetailsModalOpen(false)
    loadTasks()
  }

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

        {/* Filters */}
        <TaskFilters filters={filters} onChange={setFilters} />

        {/* Tasks List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">{t('tasks.loading')}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">{t('tasks.empty')}</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              {t('tasks.emptyAction')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => (
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
          onClose={() => setIsDetailsModalOpen(false)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </Layout>
  )
}
