import { useState, useEffect } from 'react'
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
import { useLocale } from '@/contexts/locale'
import type { Task, CreateTaskInput, TaskFilters as TaskFiltersType } from '@/types'

export const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const { t } = useLocale()

  useEffect(() => {
    loadTasks()
  }, [filters])

  const loadTasks = async () => {
    setIsLoading(true)
    try {
      const response = await tasksService.getTasks(filters)
      setTasks(response.results)
    } catch (error) {
      toast.error(t('tasks.loadFail'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTask = async (data: CreateTaskInput) => {
    try {
      await tasksService.createTask(data)
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
