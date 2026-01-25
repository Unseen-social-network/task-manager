import { useEffect, useMemo, useState } from 'react'
import { Edit2, Trash2, Phone, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { differenceInCalendarDays, format, max, min, parseISO } from 'date-fns'
import type { Project, CreateProjectInput, Task } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProjectForm } from './ProjectForm'
import { projectsService } from '@/services/projects.service'
import { tasksService } from '@/services/tasks.service'
import { useLocale } from '@/contexts/localeContext'
import { formatDate, formatDateOnly, getUrgencyColor } from '@/utils/helpers'

interface ProjectDetailsModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  isReadOnly?: boolean
}

export const ProjectDetailsModal = ({
  project,
  isOpen,
  onClose,
  onUpdate,
  isReadOnly = false,
}: ProjectDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'gantt'>('details')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const { t } = useLocale()

  const handleUpdate = async (data: CreateProjectInput) => {
    try {
      await projectsService.updateProject(project.id, data)
      toast.success(t('projects.updateSuccess'))
      setIsEditing(false)
      onUpdate()
    } catch {
      toast.error(t('projects.updateFail'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('projects.deleteConfirm'))) return

    setIsDeleting(true)
    try {
      await projectsService.deleteProject(project.id)
      toast.success(t('projects.deleteSuccess'))
      onClose()
      onUpdate()
    } catch {
      toast.error(t('projects.deleteFail'))
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('details')
      setTasksError(null)
    }
  }, [isOpen, project.id])

  useEffect(() => {
    if (!isOpen || activeTab !== 'gantt') return

    const fetchTasks = async () => {
      setTasksLoading(true)
      setTasksError(null)
      try {
        const response = await tasksService.getTasks({ project: project.id })
        setTasks(response.results)
      } catch {
        setTasksError(t('projects.gantt.loadFail'))
      } finally {
        setTasksLoading(false)
      }
    }

    fetchTasks()
  }, [activeTab, isOpen, project.id, t])

  const ganttData = useMemo(() => {
    if (tasks.length === 0) return null

    const entries = tasks.map(task => {
      const startRaw = task.created_at
      const endRaw = task.due_date ?? task.created_at
      const startDate = parseISO(startRaw)
      const endDate = parseISO(endRaw)
      const rangeStart = startDate <= endDate ? startDate : endDate
      const rangeEnd = startDate <= endDate ? endDate : startDate

      return {
        task,
        rangeStart,
        rangeEnd,
      }
    })

    const overallStart = min(entries.map(entry => entry.rangeStart))
    const overallEnd = max(entries.map(entry => entry.rangeEnd))
    const totalDays = Math.max(1, differenceInCalendarDays(overallEnd, overallStart) + 1)

    return {
      entries,
      overallStart,
      overallEnd,
      totalDays,
    }
  }, [tasks])

  if (isEditing && !isReadOnly) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('projects.editTitle')}>
        <ProjectForm
          initialData={{
            name: project.name,
            description: project.description,
            phone: project.phone,
            links: project.links,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('projects.detailsTitle')}
      footer={
        isReadOnly ? undefined : (
          <>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('actions.delete')}
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('actions.edit')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'details'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            {t('projects.tabs.details')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gantt')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'gantt'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            {t('projects.tabs.gantt')}
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.phone && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">{t('projects.phone')}</span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100">{project.phone}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Link2 className="w-4 h-4" />
                  <span className="font-medium">{t('projects.links')}</span>
                </div>
                {project.links.length > 0 ? (
                  <div className="space-y-2">
                    {project.links.map((link, index) => (
                      <a
                        key={`${link.url}-${index}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary-600 hover:underline"
                      >
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('projects.noLinks')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('projects.created')}
                </span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(project.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('projects.updated')}
                </span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(project.updated_at)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tasksLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('projects.gantt.loading')}
              </p>
            ) : tasksError ? (
              <p className="text-sm text-red-500">{tasksError}</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('projects.gantt.empty')}
              </p>
            ) : ganttData ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{t('projects.gantt.range')}</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">
                      {format(ganttData.overallStart, 'dd.MM.yyyy')} —{' '}
                      {format(ganttData.overallEnd, 'dd.MM.yyyy')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('projects.gantt.tasksCount')}: {tasks.length}
                  </div>
                </div>
                <div className="space-y-4">
                  {ganttData.entries.map(entry => {
                    const offsetDays = differenceInCalendarDays(
                      entry.rangeStart,
                      ganttData.overallStart
                    )
                    const durationDays =
                      differenceInCalendarDays(entry.rangeEnd, entry.rangeStart) + 1
                    const left = (offsetDays / ganttData.totalDays) * 100
                    const width = (durationDays / ganttData.totalDays) * 100

                    return (
                      <div key={entry.task.id} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {entry.task.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('projects.gantt.dueDate')}:{' '}
                              {entry.task.due_date
                                ? formatDateOnly(entry.task.due_date)
                                : t('projects.gantt.noDueDate')}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(
                              entry.task.urgency
                            )}`}
                          >
                            {t(`urgency.${entry.task.urgency}`)}
                          </span>
                        </div>
                        <div className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="absolute h-3 rounded-full bg-primary-500"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}
