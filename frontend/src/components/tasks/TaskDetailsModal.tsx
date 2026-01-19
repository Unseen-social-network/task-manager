import { useState, useRef } from 'react'
import { Edit2, Trash2, Upload, Download, X, Calendar, User } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Task, UpdateTaskInput } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TaskForm } from './TaskForm'
import { tasksService } from '@/services/tasks.service'
import {
  formatDate,
  getUrgencyColor,
  getStatusColor,
  getUrgencyLabel,
  getStatusLabel,
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpdate = async (data: UpdateTaskInput) => {
    try {
      await tasksService.updateTask(task.id, data)
      toast.success('Task updated successfully')
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return

    setIsDeleting(true)
    try {
      await tasksService.deleteTask(task.id)
      toast.success('Task deleted successfully')
      onClose()
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete task')
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
      toast.success('File uploaded successfully')
      onUpdate()
    } catch (error) {
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      await tasksService.deleteAttachment(attachmentId)
      toast.success('Attachment deleted successfully')
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete attachment')
    }
  }

  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Task">
        <TaskForm
          initialData={{
            title: task.title,
            description: task.description,
            urgency: task.urgency,
            status: task.status,
            due_date: task.due_date,
            contact: task.contact,
            contact_freeform: task.contact_freeform,
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
      title="Task Details"
      footer={
        <>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Title and Badges */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{task.title}</h2>
          <div className="flex gap-2">
            <Badge className={getUrgencyColor(task.urgency)}>
              {getUrgencyLabel(task.urgency)}
            </Badge>
            <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Meta Information */}
        <div className="grid grid-cols-2 gap-4">
          {task.due_date && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Due Date</span>
              </div>
              <p className="text-gray-900">{formatDate(task.due_date)}</p>
            </div>
          )}

          {(task.contact_name || task.contact_freeform) && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <User className="w-4 h-4" />
                <span className="font-medium">Contact</span>
              </div>
              <p className="text-gray-900">{task.contact_name || task.contact_freeform}</p>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>{' '}
            <span className="text-gray-900">{formatDate(task.created_at)}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>{' '}
            <span className="text-gray-900">{formatDate(task.updated_at)}</span>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Attachments</h3>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
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
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                    <span className="text-xs text-gray-500">
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
            <p className="text-sm text-gray-500">No attachments</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
