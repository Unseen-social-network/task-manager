import { useState } from 'react'
import { Edit2, Trash2, Phone, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Project, CreateProjectInput } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProjectForm } from './ProjectForm'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'
import { formatDate } from '@/utils/helpers'

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
            <span className="text-gray-500 dark:text-gray-400">{t('projects.created')}</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(project.created_at)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('projects.updated')}</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(project.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
