import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type DragEvent,
  type ClipboardEvent,
} from 'react'
import { Edit2, Trash2, Upload, Download, X, Calendar, User, FolderKanban, AtSign, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type {
  Task,
  UpdateTaskInput,
  TaskMeta,
  Project,
  TaskStatus,
  TaskComment,
  TaskStatusOption,
} from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TaskForm } from './TaskForm'
import { TaskTimeTracker } from './TaskTimeTracker'
import { PomodoroTimer } from './PomodoroTimer'
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal'
import { tasksService } from '@/services/tasks.service'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'
import { useAuthStore } from '@/contexts/authStore'
import {
  formatDate,
  getApiErrorMessage,
  getUrgencyColor,
  getStatusColor,
  formatDuration,
} from '@/utils/helpers'
import { copyToClipboard } from '@/utils/clipboard'

interface TaskDetailsModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  onRefresh?: () => void
  statusOptions?: TaskStatusOption[]
}

export const TaskDetailsModal = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onRefresh,
  statusOptions,
}: TaskDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectDetails, setProjectDetails] = useState<Project | null>(null)
  const [isTrackerRunning, setIsTrackerRunning] = useState(false)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)
  const [displayStatus, setDisplayStatus] = useState<TaskStatus>(task.status)
  const [trackerStopSignal, setTrackerStopSignal] = useState(0)
  const [pomodoroStopSignal, setPomodoroStopSignal] = useState(0)
  const [metaState, setMetaState] = useState<TaskMeta>({
    project_id: task.project_id ?? null,
    tagged_user: task.tagged_user,
    time_spent_seconds: task.time_spent_seconds ?? 0,
    tracking_completed: task.tracking_completed ?? false,
    pomodoro_sessions: task.pomodoro_sessions ?? 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUpdatesRef = useRef<UpdateTaskInput>({})
  const isSavingRef = useRef(false)
  const autoStatusRef = useRef(false)
  const statusBeforeAutoRef = useRef<TaskStatus | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null)
  const [isFlaggingQuestion, setIsFlaggingQuestion] = useState(false)
  const [isMarkingReady, setIsMarkingReady] = useState(false)
  const [isCompletingTask, setIsCompletingTask] = useState(false)
  const [isClearingQuestion, setIsClearingQuestion] = useState(false)
  const [isClearingReady, setIsClearingReady] = useState(false)
  const { t } = useLocale()
  const username = useAuthStore(state => state.username)
  const projectName = projectDetails?.name ?? task.project_name
  const taggedUsers = task.tagged_users ?? []
  const taggedUser = metaState.tagged_user ?? task.tagged_user
  const isTaggedViewer = taggedUsers.includes(username ?? '') || !!(taggedUser && taggedUser === username)
  const isOwnerViewer = !isTaggedViewer
  const hasQuestion = task.has_question ?? false
  const completionRequested = task.completion_requested ?? false
  const statusLabel = useMemo(() => {
    if (task.status_label && displayStatus === task.status) {
      return task.status_label
    }
    const matched = statusOptions?.find(status => status.key === displayStatus)
    return matched?.label ?? t(`status.${displayStatus}`)
  }, [displayStatus, statusOptions, t, task.status, task.status_label])

  useEffect(() => {
    setMetaState({
      project_id: task.project_id ?? null,
      tagged_user: task.tagged_user,
      time_spent_seconds: task.time_spent_seconds ?? 0,
      tracking_completed: task.tracking_completed ?? false,
      pomodoro_sessions: task.pomodoro_sessions ?? 0,
    })
    setDisplayStatus(task.status)
    autoStatusRef.current = false
    statusBeforeAutoRef.current = null
    pendingUpdatesRef.current = {}
    setReplyTo(null)
    setCommentBody('')
  }, [task])

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const response = await tasksService.getTaskComments(task.id)
      setComments(response)
    } catch {
      toast.error(t('tasks.comments.loadFail'))
    } finally {
      setCommentsLoading(false)
    }
  }, [task.id, t])

  useEffect(() => {
    if (!isOpen) return
    void loadComments()
  }, [isOpen, loadComments])

  useEffect(() => {
    let isActive = true
    const loadProject = async () => {
      if (!metaState.project_id) {
        setProjectDetails(null)
        return
      }
      try {
        const project = await projectsService.getProject(metaState.project_id)
        if (isActive) {
          setProjectDetails(project)
        }
      } catch {
        if (isActive) {
          setProjectDetails(null)
        }
      }
    }
    loadProject()
    return () => {
      isActive = false
    }
  }, [metaState.project_id])

  const flushPending = useCallback(
    async (force = false) => {
      if (isSavingRef.current) return
      const pending = pendingUpdatesRef.current
      if (!force && Object.keys(pending).length === 0) return
      if (Object.keys(pending).length === 0) return
      pendingUpdatesRef.current = {}
      isSavingRef.current = true
      try {
        await tasksService.updateTask(task.id, pending)
      } catch {
        toast.error(t('tasks.updateFail'))
      } finally {
        isSavingRef.current = false
        if (Object.keys(pendingUpdatesRef.current).length > 0) {
          void flushPending(true)
        }
      }
    },
    [task.id, t]
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      void flushPending()
    }, 10000)
    return () => {
      window.clearInterval(interval)
      void flushPending(true)
    }
  }, [flushPending])

  const updateMeta = useCallback(
    (updates: TaskMeta) => {
      setMetaState(prev => {
        const next = {
          ...prev,
          ...updates,
        }
        pendingUpdatesRef.current = {
          ...pendingUpdatesRef.current,
          ...updates,
        }
        if (updates.tracking_completed || updates.pomodoro_sessions !== undefined) {
          void flushPending(true)
        }
        return next
      })
    },
    [flushPending]
  )

  const updateTaskStatus = useCallback(
    async (status: TaskStatus) => {
      setDisplayStatus(status)
      try {
        await tasksService.updateTask(task.id, { status })
      } catch (error) {
        toast.error(getApiErrorMessage(error, t('tasks.updateFail')))
      }
    },
    [task.id, t]
  )

  useEffect(() => {
    const isWorkActive = isTrackerRunning || isPomodoroRunning
    if (displayStatus === 'done' || displayStatus === 'canceled') {
      return
    }
    if (isWorkActive && displayStatus === 'todo' && !autoStatusRef.current) {
      autoStatusRef.current = true
      statusBeforeAutoRef.current = displayStatus
      void updateTaskStatus('in_progress')
    } else if (!isWorkActive && autoStatusRef.current) {
      autoStatusRef.current = false
      const previousStatus = statusBeforeAutoRef.current
      statusBeforeAutoRef.current = null
      if (previousStatus === 'todo') {
        void updateTaskStatus('todo')
      }
    }
  }, [displayStatus, isPomodoroRunning, isTrackerRunning, updateTaskStatus])

  const handleUpdate = async (data: UpdateTaskInput, attachments: File[] = []) => {
    try {
      const { project_id, tagged_user, ...payload } = data
      const normalizedProjectId =
        typeof project_id === 'number' && Number.isFinite(project_id) ? project_id : null
      const updated = await tasksService.updateTask(task.id, {
        ...payload,
        tagged_user,
        project_id: normalizedProjectId,
      })
      if (attachments.length > 0) {
        const results = await Promise.allSettled(
          attachments.map(file => tasksService.uploadAttachment(task.id, file))
        )
        if (results.some(result => result.status === 'rejected')) {
          toast.error(t('tasks.form.attachmentsUploadFail'))
        }
      }
      setDisplayStatus(updated.status)
      setMetaState(prev => ({
        ...prev,
        project_id: updated.project_id ?? null,
        tagged_user: updated.tagged_user,
      }))
      toast.success(t('tasks.updateSuccess'))
      setIsEditing(false)
      onUpdate()
    } catch {
      toast.error(t('tasks.updateFail'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('tasks.deleteConfirm'))) return

    setIsDeleting(true)
    try {
      await tasksService.deleteTask(task.id)
      toast.success(t('tasks.deleteSuccess'))
      onClose()
      onUpdate()
    } catch {
      toast.error(t('tasks.deleteFail'))
    } finally {
      setIsDeleting(false)
    }
  }

  const uploadAttachments = async (files: File[]) => {
    if (files.length === 0) return
    setIsUploading(true)
    try {
      const results = await Promise.allSettled(
        files.map(file => tasksService.uploadAttachment(task.id, file))
      )
      const hasFailures = results.some(result => result.status === 'rejected')
      const hasSuccesses = results.some(result => result.status === 'fulfilled')
      if (hasFailures) {
        toast.error(t('tasks.uploadFail'))
      }
      if (hasSuccesses) {
        toast.success(t('tasks.uploadSuccess'))
        onRefresh?.()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    await uploadAttachments(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAttachmentPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => Boolean(file))
    if (!files.length) return
    await uploadAttachments(files)
  }

  const handleAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleAttachmentDragEnter = () => {
    setIsDragActive(true)
  }

  const handleAttachmentDragLeave = () => {
    setIsDragActive(false)
  }

  const handleAttachmentDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files ?? [])
    setIsDragActive(false)
    if (!files.length) return
    await uploadAttachments(files)
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm(t('tasks.attachmentDeleteConfirm'))) return

    try {
      await tasksService.deleteAttachment(attachmentId)
      toast.success(t('tasks.attachmentDeleteSuccess'))
      onRefresh?.()
    } catch {
      toast.error(t('tasks.attachmentDeleteFail'))
    }
  }

  const handleProjectOpen = () => {
    if (!projectDetails) return
    setSelectedProject(projectDetails)
    setIsProjectModalOpen(true)
  }

  const handleProjectClose = () => {
    setIsProjectModalOpen(false)
    setSelectedProject(null)
  }

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedBody = commentBody.trim()
    if (!trimmedBody) {
      toast.error(t('tasks.comments.bodyRequired'))
      return
    }
    setCommentSubmitting(true)
    try {
      const comment = await tasksService.createTaskComment(task.id, {
        body: trimmedBody,
        parent: replyTo?.id ?? null,
      })
      setComments(prev => [...prev, comment])
      setCommentBody('')
      setReplyTo(null)
      toast.success(t('tasks.comments.createSuccess'))
    } catch {
      toast.error(t('tasks.comments.createFail'))
    } finally {
      setCommentSubmitting(false)
    }
  }

  const commentsByParent = useMemo(() => {
    const map = new Map<number | null, TaskComment[]>()
    comments.forEach(comment => {
      const key = comment.parent ?? null
      const list = map.get(key) ?? []
      list.push(comment)
      map.set(key, list)
    })
    return map
  }, [comments])

  const renderComments = (parentId: number | null, depth = 0) => {
    const entries = commentsByParent.get(parentId) ?? []
    return entries.map(comment => (
      <div key={comment.id} className={depth > 0 ? 'mt-3 ml-6 border-l border-gray-200 pl-4 dark:border-gray-800' : 'mt-3'}>
        {(() => {
          const previewLength = 280
          const isLong = comment.body.length > previewLength
          const isExpanded = expandedComments.has(comment.id)
          const bodyText = isLong && !isExpanded ? `${comment.body.slice(0, previewLength)}…` : comment.body

          return (
            <>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {comment.author_username} • {formatDate(comment.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(comment)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  {t('tasks.comments.reply')}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                {bodyText}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedComments(prev => {
                      const next = new Set(prev)
                      if (next.has(comment.id)) {
                        next.delete(comment.id)
                      } else {
                        next.add(comment.id)
                      }
                      return next
                    })
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {isExpanded ? t('tasks.comments.showLess') : t('tasks.comments.showMore')}
                </button>
              )}
            </>
          )
        })()}
        {renderComments(comment.id, depth + 1)}
      </div>
    ))
  }

  const handleClose = () => {
    if (isTrackerRunning || isPomodoroRunning) {
      const shouldStop = confirm(t('tasks.timerCloseConfirm'))
      if (!shouldStop) return
      setTrackerStopSignal(prev => prev + 1)
      setPomodoroStopSignal(prev => prev + 1)
    }
    onClose()
  }

  const handleShare = async () => {
    const url = new URL(window.location.href)
    url.pathname = '/tasks'
    url.searchParams.set('task', String(task.id))
    try {
      await copyToClipboard(url.toString())
      toast.success(t('tasks.shareSuccess'))
    } catch {
      toast.error(t('tasks.shareFail'))
    }
  }

  const handleQuestionFlag = async () => {
    setIsFlaggingQuestion(true)
    try {
      await tasksService.markTaskQuestion(task.id)
      toast.success(t('tasks.flags.questionSuccess'))
      onRefresh?.()
    } catch {
      toast.error(t('tasks.flags.questionFail'))
    } finally {
      setIsFlaggingQuestion(false)
    }
  }

  const handleReadyFlag = async () => {
    setIsMarkingReady(true)
    try {
      await tasksService.markTaskReady(task.id)
      toast.success(t('tasks.flags.readySuccess'))
      onRefresh?.()
    } catch {
      toast.error(t('tasks.flags.readyFail'))
    } finally {
      setIsMarkingReady(false)
    }
  }

  const handleClearQuestion = async () => {
    setIsClearingQuestion(true)
    try {
      await tasksService.clearTaskQuestion(task.id)
      toast.success(t('tasks.flags.questionClearSuccess'))
      onRefresh?.()
    } catch {
      toast.error(t('tasks.flags.questionClearFail'))
    } finally {
      setIsClearingQuestion(false)
    }
  }

  const handleClearReady = async () => {
    setIsClearingReady(true)
    try {
      await tasksService.clearTaskReady(task.id)
      toast.success(t('tasks.flags.readyClearSuccess'))
      onRefresh?.()
    } catch {
      toast.error(t('tasks.flags.readyClearFail'))
    } finally {
      setIsClearingReady(false)
    }
  }

  const handleCompleteTask = async () => {
    if (displayStatus === 'done') return
    setIsCompletingTask(true)
    try {
      await tasksService.updateTask(task.id, { status: 'done', completion_requested: false })
      setDisplayStatus('done')
      toast.success(t('tasks.completeSuccess'))
      onRefresh?.()
      onUpdate()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('tasks.completeFail')))
    } finally {
      setIsCompletingTask(false)
    }
  }

  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={t('tasks.editTitle')}>
        <TaskForm
          initialData={{
            title: task.title,
            description: task.description,
            urgency: task.urgency,
            status: displayStatus,
            due_date: task.due_date,
            contact: task.contact,
            contacts: task.contacts ?? (task.contact ? [task.contact] : []),
            contact_freeform: task.contact_freeform,
            contact_freeform_list: task.contact_freeform_list,
            project_id: metaState.project_id ?? undefined,
            tagged_user: metaState.tagged_user,
            tagged_users: task.tagged_users,
          }}
          statusOptions={statusOptions}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>
    )
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('tasks.detailsTitle')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {isTaggedViewer && (
              <>
                {hasQuestion ? (
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={handleClearQuestion}
                    isLoading={isClearingQuestion}
                  >
                    {t('tasks.actions.clearQuestion')}
                  </Button>
                ) : (
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={handleQuestionFlag}
                    isLoading={isFlaggingQuestion}
                  >
                    {t('tasks.actions.question')}
                  </Button>
                )}
                {completionRequested ? (
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={handleClearReady}
                    isLoading={isClearingReady}
                  >
                    {t('tasks.actions.clearReady')}
                  </Button>
                ) : (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleReadyFlag}
                    isLoading={isMarkingReady}
                  >
                    {t('tasks.actions.ready')}
                  </Button>
                )}
              </>
            )}
            {isOwnerViewer && (
              <>
                {hasQuestion && (
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={handleClearQuestion}
                    isLoading={isClearingQuestion}
                  >
                    {t('tasks.actions.clearQuestion')}
                  </Button>
                )}
                {completionRequested && (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      variant="secondary"
                      onClick={handleClearReady}
                      isLoading={isClearingReady}
                    >
                      {t('tasks.actions.clearReady')}
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={handleCompleteTask}
                      isLoading={isCompletingTask}
                      disabled={displayStatus === 'done'}
                    >
                      {t('tasks.actions.complete')}
                    </Button>
                  </div>
                )}
              </>
            )}
            {!isTaggedViewer && (
              <Button
                className="w-full sm:w-auto"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('actions.delete')}
              </Button>
            )}
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={handleShare}
            >
              <Link2 className="w-4 h-4 mr-2" />
              {t('tasks.share')}
            </Button>
            {!isTaggedViewer && (
              <Button className="w-full sm:w-auto" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                {t('actions.edit')}
              </Button>
            )}
          </div>
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
            <Badge className={getStatusColor(displayStatus)}>
              {statusLabel}
            </Badge>
            {hasQuestion && <Badge variant="warning">{t('tasks.flags.question')}</Badge>}
            {completionRequested && <Badge variant="success">{t('tasks.flags.ready')}</Badge>}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projectName && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <FolderKanban className="w-4 h-4" />
                <span className="font-medium">{t('tasks.project')}</span>
              </div>
              {projectDetails ? (
                <button
                  type="button"
                  onClick={handleProjectOpen}
                  className="text-left text-gray-900 dark:text-gray-100 underline decoration-dotted underline-offset-4 hover:text-primary-600"
                  aria-label={t('tasks.projectOpen')}
                >
                  {projectName}
                </button>
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{projectName}</p>
              )}
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

          {(() => {
            const contactLabels = [
              ...(task.contact_names?.length
                ? task.contact_names
                : task.contact_name
                  ? [task.contact_name]
                  : []),
              ...(task.contact_freeform_list?.length
                ? task.contact_freeform_list
                : task.contact_freeform
                  ? [task.contact_freeform]
                  : []),
            ]
            if (contactLabels.length === 0) return null
            return (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{t('tasks.contact')}</span>
                </div>
                <p className="text-gray-900 dark:text-gray-100">
                  {contactLabels.join(', ')}
                </p>
              </div>
            )
          })()}

          {(taggedUsers.length > 0 || taggedUser) && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <AtSign className="w-4 h-4" />
                <span className="font-medium">{t('tasks.taggedUser')}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-gray-900 dark:text-gray-100">
                {(taggedUsers.length > 0
                  ? taggedUsers
                  : taggedUser
                    ? [taggedUser]
                    : []
                ).map(user => (
                  <span
                    key={user}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800"
                  >
                    @{user}
                  </span>
                ))}
              </div>
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
            isLocked={false}
            stopSignal={trackerStopSignal}
            externalRunning={isPomodoroRunning}
            onRunningChange={setIsTrackerRunning}
            onUpdate={updateMeta}
          />
          <PomodoroTimer
            key={`pomodoro-${task.id}`}
            isLocked={metaState.tracking_completed ?? false}
            initialSessions={metaState.pomodoro_sessions ?? 0}
            stopSignal={pomodoroStopSignal}
            onRunningChange={setIsPomodoroRunning}
            onUpdate={updateMeta}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {t('tasks.statsTitle')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-gray-500 dark:text-gray-400">{t('tasks.statsTime')}</div>
              <div className="text-gray-900 dark:text-gray-100 font-semibold">
                {formatDuration(metaState.time_spent_seconds ?? 0)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-gray-500 dark:text-gray-400">{t('tasks.statsPomodoro')}</div>
              <div className="text-gray-900 dark:text-gray-100 font-semibold">
                {metaState.pomodoro_sessions ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="text-gray-500 dark:text-gray-400">{t('tasks.statsTracking')}</div>
              <div className="text-gray-900 dark:text-gray-100 font-semibold">
                {metaState.tracking_completed ? t('tasks.statsTrackingDone') : t('tasks.statsTrackingInProgress')}
              </div>
            </div>
          </div>
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

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {t('tasks.comments.title')}
          </h3>
          {commentsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('tasks.comments.loading')}
            </p>
          ) : comments.length > 0 ? (
            <div>{renderComments(null)}</div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('tasks.comments.empty')}
            </p>
          )}
          <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3">
            {replyTo && (
              <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <span>
                  {t('tasks.comments.replyingTo')} @{replyTo.author_username}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  {t('tasks.comments.cancelReply')}
                </button>
              </div>
            )}
            <textarea
              value={commentBody}
              onChange={event => setCommentBody(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              placeholder={t('tasks.comments.placeholder')}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" isLoading={commentSubmitting}>
                {t('tasks.comments.submit')}
              </Button>
            </div>
          </form>
        </div>

        {/* Attachments */}
        <div
          className={`rounded-lg border border-dashed p-3 transition ${
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40'
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onDragOver={handleAttachmentDragOver}
          onDragEnter={handleAttachmentDragEnter}
          onDragLeave={handleAttachmentDragLeave}
          onDrop={handleAttachmentDrop}
          onPaste={handleAttachmentPaste}
        >
          <div className="flex items-center justify-between mb-2">
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
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t('tasks.form.attachmentsHint')}
          </p>

          {task.attachments && task.attachments.length > 0 ? (
            <div className="space-y-2">
              {task.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-700"
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
    {selectedProject && (
      <ProjectDetailsModal
        project={selectedProject}
        isOpen={isProjectModalOpen}
        onClose={handleProjectClose}
        onUpdate={handleProjectClose}
        isReadOnly={selectedProject.is_owner === false}
      />
    )}
    </>
  )
}
