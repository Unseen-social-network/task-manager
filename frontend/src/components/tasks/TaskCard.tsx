import { Calendar, Paperclip, User } from 'lucide-react'
import type { Task } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDateOnly, getUrgencyColor, getStatusColor, getUrgencyLabel, getStatusLabel, truncate } from '@/utils/helpers'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="space-y-3">
        {/* Title and Badges */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">{task.title}</h3>
          <div className="flex gap-2">
            <Badge className={getUrgencyColor(task.urgency)}>
              {getUrgencyLabel(task.urgency)}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600">{truncate(task.description, 150)}</p>
        )}

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
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
