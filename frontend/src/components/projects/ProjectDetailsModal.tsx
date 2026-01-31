import { useEffect, useMemo, useState } from 'react'
import { Edit2, Trash2, Phone, Link2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  max,
  min,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Project, CreateProjectInput, Task, TaskStatusOption } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProjectForm } from './ProjectForm'
import { projectsService } from '@/services/projects.service'
import { taskStatusesService } from '@/services/task-statuses.service'
import { tasksService } from '@/services/tasks.service'
import { useLocale } from '@/contexts/localeContext'
import { formatDate, formatDateOnly, getUrgencyColor } from '@/utils/helpers'

interface ProjectDetailsModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  isReadOnly?: boolean
  onRemoveShare?: () => void
}

export const ProjectDetailsModal = ({
  project,
  isOpen,
  onClose,
  onUpdate,
  isReadOnly = false,
  onRemoveShare,
}: ProjectDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'gantt' | 'sharing'>('details')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusOption[]>([])
  const [shareAccesses, setShareAccesses] = useState<
    Array<{ user_id: number; username: string; email: string; created_at: string }>
  >([])
  const [shareAccessError, setShareAccessError] = useState<string | null>(null)
  const [shareAccessLoading, setShareAccessLoading] = useState(false)
  const { t } = useLocale()
  const isOwner = project.is_owner !== false

  const handleShare = async (mode: 'link' | 'copy') => {
    try {
      const share = await projectsService.createShare(project.id)
      const url = mode === 'link' ? share.share_url : share.copy_url
      await navigator.clipboard.writeText(url)
      toast.success(
        mode === 'link' ? t('projects.shareLinkSuccess') : t('projects.shareCopySuccess')
      )
    } catch {
      toast.error(t('projects.shareFail'))
    }
  }

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
      setShareAccessError(null)
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

  useEffect(() => {
    if (!isOpen) return
    let isActive = true
    const loadStatuses = async () => {
      try {
        const response = await taskStatusesService.getTaskStatuses()
        if (!isActive) return
        setTaskStatuses(response)
      } catch {
        if (!isActive) return
        setTaskStatuses([])
      }
    }
    loadStatuses()
    return () => {
      isActive = false
    }
  }, [isOpen])

  const statusOptions = useMemo<TaskStatusOption[]>(() => {
    if (taskStatuses.length) {
      return [...taskStatuses].sort((a, b) => a.order - b.order)
    }
    return [
      { key: 'todo', label: t('status.todo'), order: 1, is_archived: false, is_done: false },
      { key: 'in_progress', label: t('status.in_progress'), order: 2, is_archived: false, is_done: false },
      { key: 'done', label: t('status.done'), order: 3, is_archived: true, is_done: true },
      { key: 'canceled', label: t('status.canceled'), order: 4, is_archived: true, is_done: false },
    ]
  }, [taskStatuses, t])

  useEffect(() => {
    if (!isOpen || activeTab !== 'sharing' || !isOwner) return
    let isActive = true
    const fetchAccesses = async () => {
      setShareAccessLoading(true)
      setShareAccessError(null)
      try {
        const accessList = await projectsService.getProjectAccess(project.id)
        if (!isActive) return
        setShareAccesses(accessList)
      } catch {
        if (!isActive) return
        setShareAccessError(t('projects.shareAccessLoadFail'))
      } finally {
        if (isActive) setShareAccessLoading(false)
      }
    }
    void fetchAccesses()
    return () => {
      isActive = false
    }
  }, [activeTab, isOpen, isOwner, project.id, t])

  const statusMetaMap = useMemo(() => {
    return new Map(statusOptions.map(status => [status.key, status]))
  }, [statusOptions])

  const ganttData = useMemo(() => {
    if (tasks.length === 0) return null

    const today = startOfDay(new Date())
    const upcomingEnd = addDays(today, 7)

    const entries = tasks.map(task => {
      const statusMeta = statusMetaMap.get(task.status)
      const isArchived = statusMeta?.is_archived ?? false
      const startRaw = task.created_at
      const endRaw = task.due_date ?? task.created_at
      const startDate = parseISO(startRaw)
      const endDate = parseISO(endRaw)
      const rangeStart = startDate <= endDate ? startDate : endDate
      const rangeEnd = startDate <= endDate ? endDate : startDate
      const dueDate = task.due_date ? parseISO(task.due_date) : null
      const isOverdue = !!dueDate && isBefore(dueDate, today) && !isArchived
      const isDueSoon =
        !!dueDate && !isOverdue && !isBefore(upcomingEnd, dueDate) && !isArchived

      return {
        task,
        rangeStart,
        rangeEnd,
        dueDate,
        isOverdue,
        isDueSoon,
      }
    })

    const overallStart = min(entries.map(entry => entry.rangeStart))
    const overallEnd = max(entries.map(entry => entry.rangeEnd))
    const totalDays = Math.max(1, differenceInCalendarDays(overallEnd, overallStart) + 1)

      const summary = entries.reduce(
        (acc, entry) => {
        acc.total += 1
        if (!entry.task.due_date) acc.noDueDate += 1
        if (entry.isOverdue) acc.overdue += 1
        if (entry.isDueSoon) acc.dueSoon += 1
        acc.byUrgency[entry.task.urgency] += 1
        acc.byStatus[entry.task.status] = (acc.byStatus[entry.task.status] ?? 0) + 1
        return acc
      },
      {
        total: 0,
        overdue: 0,
        dueSoon: 0,
        noDueDate: 0,
        byUrgency: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        byStatus: statusOptions.reduce<Record<string, number>>((acc, status) => {
          acc[status.key] = 0
          return acc
        }, {}),
      }
    )

    return {
      entries,
      overallStart,
      overallEnd,
      totalDays,
      summary,
    }
  }, [statusMetaMap, statusOptions, tasks])

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
        <>
          {!isReadOnly && (
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('actions.delete')}
            </Button>
          )}
          {isReadOnly && !isOwner && onRemoveShare && (
            <Button variant="secondary" onClick={onRemoveShare}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('projects.shareRemove')}
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" onClick={() => handleShare('link')}>
              <Link2 className="w-4 h-4 mr-2" />
              {t('projects.shareLink')}
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" onClick={() => handleShare('copy')}>
              <Copy className="w-4 h-4 mr-2" />
              {t('projects.shareCopy')}
            </Button>
          )}
          {!isReadOnly && isOwner && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('actions.edit')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {isReadOnly && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('projects.shareReadOnly')}
          </p>
        )}
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
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('sharing')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'sharing'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              {t('projects.tabs.sharing')}
            </button>
          )}
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
        ) : activeTab === 'gantt' ? (
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('projects.gantt.summary.total')}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {ganttData.summary.total}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('projects.gantt.summary.noDue')}: {ganttData.summary.noDueDate}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-900/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-red-600 dark:text-red-300">
                      {t('projects.gantt.summary.overdue')}
                    </p>
                    <p className="text-2xl font-semibold text-red-700 dark:text-red-200">
                      {ganttData.summary.overdue}
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-200/80">
                      {t('projects.gantt.summary.dueSoon')}: {ganttData.summary.dueSoon}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('projects.gantt.summary.urgency')}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>{t('urgency.critical')}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ganttData.summary.byUrgency.critical}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('urgency.high')}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ganttData.summary.byUrgency.high}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('urgency.medium')}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ganttData.summary.byUrgency.medium}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('urgency.low')}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {ganttData.summary.byUrgency.low}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('projects.gantt.summary.status')}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      {statusOptions.map(status => (
                        <div key={status.key} className="flex justify-between">
                          <span>{status.label}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {ganttData.summary.byStatus[status.key] ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                            {(entry.isOverdue || entry.isDueSoon) && (
                              <p
                                className={`text-xs font-medium ${
                                  entry.isOverdue
                                    ? 'text-red-600 dark:text-red-300'
                                    : 'text-orange-600 dark:text-orange-300'
                                }`}
                              >
                                {entry.isOverdue
                                  ? t('projects.gantt.overdue')
                                  : t('projects.gantt.dueSoon')}
                              </p>
                            )}
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
                            className={`absolute h-3 rounded-full ${
                              entry.isOverdue
                                ? 'bg-red-500'
                                : entry.isDueSoon
                                  ? 'bg-orange-500'
                                  : 'bg-primary-500'
                            }`}
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
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('projects.shareAccessHint')}
            </p>
            {shareAccessLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('projects.shareAccessLoading')}
              </p>
            ) : shareAccessError ? (
              <p className="text-sm text-red-500">{shareAccessError}</p>
            ) : shareAccesses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('projects.shareAccessEmpty')}
              </p>
            ) : (
              <div className="space-y-2">
                {shareAccesses.map(access => (
                  <div
                    key={access.user_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {access.username}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">{access.email}</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await projectsService.revokeProjectAccess(project.id, access.user_id)
                          setShareAccesses(prev => prev.filter(item => item.user_id !== access.user_id))
                        } catch {
                          toast.error(t('projects.shareAccessRemoveFail'))
                        }
                      }}
                    >
                      {t('projects.shareAccessRemove')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
