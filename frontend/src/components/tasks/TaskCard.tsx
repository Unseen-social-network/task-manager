import { AtSign, Calendar, FolderKanban, Paperclip, Timer, User } from 'lucide-react'
import type { Task } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLocale } from '@/contexts/localeContext'
import { formatDateOnly, formatDuration, getUrgencyColor, getStatusColor, truncate } from '@/utils/helpers'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const { t } = useLocale()

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="space-y-3">
        {/* Title and Badges */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {task.title}
          </h3>
          <div className="flex gap-2">
            <Badge className={getUrgencyColor(task.urgency)}>{t(`urgency.${task.urgency}`)}</Badge>
            <Badge className={getStatusColor(task.status)}>{t(`status.${task.status}`)}</Badge>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {truncate(task.description, 150)}
          </p>
        )}

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {task.project_name && (
            <div className="flex items-center gap-1">
              <FolderKanban className="w-4 h-4" />
              <span>{task.project_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDateOnly(task.due_date)}</span>
            </div>
          )}

          {(task.contact_name || task.contact_freeform) && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{task.contact_name || task.contact_freeform}</span>
            </div>
          )}

          {task.tagged_user && (
            <div className="flex items-center gap-1">
              <AtSign className="w-4 h-4" />
              <span>@{task.tagged_user}</span>
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
