import { useState, useRef, useEffect, useCallback } from 'react'
import { Edit2, Trash2, Upload, Download, X, Calendar, User, FolderKanban, AtSign } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Task, UpdateTaskInput, TaskMeta } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TaskForm } from './TaskForm'
import { TaskTimeTracker } from './TaskTimeTracker'
import { PomodoroTimer } from './PomodoroTimer'
import { tasksService } from '@/services/tasks.service'
import { taskMetaService } from '@/services/taskMeta.service'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'
import { useAuthStore } from '@/contexts/authStore'
import {
  formatDate,
  getUrgencyColor,
  getStatusColor,
} from '@/utils/helpers'

interface TaskDetailsModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export const TaskDetailsModal = ({ task, isOpen, onClose, onUpdate }: TaskDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [metaState, setMetaState] = useState<TaskMeta>({
    project_id: task.project_id ?? null,
    tagged_user: task.tagged_user,
    time_spent_seconds: task.time_spent_seconds ?? 0,
    tracking_completed: task.tracking_completed ?? false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLocale()
  const username = useAuthStore(state => state.username)
  const projectName = metaState.project_id
    ? projectsService.getProject(metaState.project_id)?.name
    : task.project_name
  const taggedUser = metaState.tagged_user ?? task.tagged_user
  const isTaggedViewer = !!(taggedUser && taggedUser === username)

  useEffect(() => {
    setMetaState({
      project_id: task.project_id ?? null,
      tagged_user: task.tagged_user,
      time_spent_seconds: task.time_spent_seconds ?? 0,
      tracking_completed: task.tracking_completed ?? false,
    })
  }, [task])

  const updateMeta = useCallback(
    (updates: TaskMeta) => {
      setMetaState(prev => {
        const next = {
          ...prev,
          ...updates,
        }
        taskMetaService.setTaskMeta(task.id, next)
        return next
      })
    },
    [task.id]
  )

  const handleUpdate = async (data: UpdateTaskInput) => {
    try {
      const { project_id, tagged_user, ...payload } = data
      const normalizedProjectId =
        typeof project_id === 'number' && Number.isFinite(project_id) ? project_id : null
      await tasksService.updateTask(task.id, payload)
      updateMeta({ project_id: normalizedProjectId ?? null, tagged_user })
      toast.success(t('tasks.updateSuccess'))
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      toast.error(t('tasks.updateFail'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('tasks.deleteConfirm'))) return

    setIsDeleting(true)
    try {
      await tasksService.deleteTask(task.id)
      taskMetaService.deleteTaskMeta(task.id)
      toast.success(t('tasks.deleteSuccess'))
      onClose()
      onUpdate()
    } catch (error) {
      toast.error(t('tasks.deleteFail'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await tasksService.uploadAttachment(task.id, file)
      toast.success(t('tasks.uploadSuccess'))
      onUpdate()
    } catch (error) {
      toast.error(t('tasks.uploadFail'))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm(t('tasks.attachmentDeleteConfirm'))) return

    try {
      await tasksService.deleteAttachment(attachmentId)
      toast.success(t('tasks.attachmentDeleteSuccess'))
      onUpdate()
    } catch (error) {
      toast.error(t('tasks.attachmentDeleteFail'))
    }
  }

  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('tasks.editTitle')}>
        <TaskForm
          initialData={{
            title: task.title,
            description: task.description,
            urgency: task.urgency,
            status: task.status,
            due_date: task.due_date,
            contact: task.contact,
            contact_freeform: task.contact_freeform,
            project_id: metaState.project_id ?? undefined,
            tagged_user: metaState.tagged_user,
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
      title={t('tasks.detailsTitle')}
      footer={
        <>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isTaggedViewer}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('actions.delete')}
          </Button>
          <Button onClick={() => setIsEditing(true)} disabled={isTaggedViewer}>
            <Edit2 className="w-4 h-4 mr-2" />
            {t('actions.edit')}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Title and Badges */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {task.title}
          </h2>
          <div className="flex gap-2">
            <Badge className={getUrgencyColor(task.urgency)}>{t(`urgency.${task.urgency}`)}</Badge>
            <Badge className={getStatusColor(task.status)}>{t(`status.${task.status}`)}</Badge>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {t('tasks.description')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Meta Information */}
        <div className="grid grid-cols-2 gap-4">
          {projectName && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <FolderKanban className="w-4 h-4" />
                <span className="font-medium">{t('tasks.project')}</span>
              </div>
              <p className="text-gray-900 dark:text-gray-100">{projectName}</p>
            </div>
          )}

          {task.due_date && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{t('tasks.dueDate')}</span>
              </div>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(task.due_date)}</p>
            </div>
          )}

          {(task.contact_name || task.contact_freeform) && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <User className="w-4 h-4" />
                <span className="font-medium">{t('tasks.contact')}</span>
              </div>
              <p className="text-gray-900 dark:text-gray-100">
                {task.contact_name || task.contact_freeform}
              </p>
            </div>
          )}

          {taggedUser && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <AtSign className="w-4 h-4" />
                <span className="font-medium">{t('tasks.taggedUser')}</span>
              </div>
              <p className="text-gray-900 dark:text-gray-100">@{taggedUser}</p>
            </div>
          )}
        </div>

        {isTaggedViewer && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('tasks.taggedReadOnly')}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TaskTimeTracker
            key={`tracker-${task.id}`}
            initialSeconds={metaState.time_spent_seconds ?? 0}
            trackingCompleted={metaState.tracking_completed ?? false}
            isLocked={isTaggedViewer}
            onUpdate={updateMeta}
          />
          <PomodoroTimer
            key={`pomodoro-${task.id}`}
            isLocked={isTaggedViewer || (metaState.tracking_completed ?? false)}
            currentSeconds={metaState.time_spent_seconds ?? 0}
            onUpdate={updateMeta}
          />
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('tasks.created')}</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{formatDate(task.created_at)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('tasks.updated')}</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{formatDate(task.updated_at)}</span>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('tasks.attachments')}
            </h3>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {t('tasks.upload')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {task.attachments && task.attachments.length > 0 ? (
            <div className="space-y-2">
              {task.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline truncate"
                    >
                      {attachment.original_name}
                    </a>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.noAttachments')}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
