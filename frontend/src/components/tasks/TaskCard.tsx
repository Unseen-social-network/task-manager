import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  Calendar,
  Circle,
  Flame,
  FolderKanban,
  Paperclip,
  Timer,
  User,
} from 'lucide-react'
import type { Task } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLocale } from '@/contexts/localeContext'
import {
  formatDateOnly,
  formatDuration,
  getStatusColor,
  getUrgencyBorder,
  getUrgencyColor,
  truncate,
} from '@/utils/helpers'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const { t } = useLocale()
  const urgencyIcons = {
    low: Circle,
    medium: AlertCircle,
    high: Flame,
    critical: AlertTriangle,
  }
  const UrgencyIcon = urgencyIcons[task.urgency] ?? AlertCircle

  return (
    <Card className={`p-4 border-l-4 ${getUrgencyBorder(task.urgency)}`} onClick={onClick}>
      <div className="space-y-3">
        {/* Title and Badges */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
            {task.title}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge className={getUrgencyColor(task.urgency)}>
              <UrgencyIcon className="w-3 h-3 mr-1" />
              {t(`urgency.${task.urgency}`)}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {task.status_label ?? t(`status.${task.status}`)}
            </Badge>
            {task.has_question && (
              <Badge variant="warning">{t('tasks.flags.question')}</Badge>
            )}
            {task.completion_requested && (
              <Badge variant="success">{t('tasks.flags.ready')}</Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
            {truncate(task.description, 150)}
          </p>
        )}

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {task.project_name && (
            <div className="flex items-center gap-1 min-w-0">
              <FolderKanban className="w-4 h-4" />
              <span className="break-words">{task.project_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-1 min-w-0">
              <Calendar className="w-4 h-4" />
              <span>{formatDateOnly(task.due_date)}</span>
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
              <div className="flex items-center gap-1 min-w-0">
                <User className="w-4 h-4" />
                <span className="break-words">{contactLabels.join(', ')}</span>
              </div>
            )
          })()}

          {(task.tagged_users?.length || task.tagged_user) && (
            <div className="flex items-center gap-1 min-w-0">
              <AtSign className="w-4 h-4" />
              <span className="break-words">
                {task.tagged_users?.length
                  ? `@${task.tagged_users[0]}${task.tagged_users.length > 1 ? ` +${task.tagged_users.length - 1}` : ''}`
                  : `@${task.tagged_user}`}
              </span>
            </div>
          )}

          {typeof task.time_spent_seconds === 'number' && task.time_spent_seconds > 0 && (
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span>{formatDuration(task.time_spent_seconds)}</span>
            </div>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
