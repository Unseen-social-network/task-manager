import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'
import type { Project, CreateProjectInput } from '@/types'

type PaginatedResponse<T> = {
  items?: T[]
  results?: T[]
  data?: T[]
}

const toProjectList = (value: unknown): Project[] => {
  if (Array.isArray(value)) return value as Project[]

  if (value && typeof value === 'object') {
    const v = value as PaginatedResponse<Project>

    if (Array.isArray(v.items)) return v.items
    if (Array.isArray(v.results)) return v.results
    if (Array.isArray(v.data)) return v.data
  }

  return []
}

export const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const { t } = useLocale()

  const loadProjects = useCallback(async () => {
    try {
      const resp = await Promise.resolve(projectsService.getProjects())
      setProjects(toProjectList(resp))
    } catch {
      // если ключа нет — замени на строку или добавь в словарь
      toast.error(t('projects.loadFail'))
    }
  }, [t])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const handleCreateProject = async (data: CreateProjectInput) => {
    try {
      await Promise.resolve(projectsService.createProject(data))
      toast.success(t('projects.createSuccess'))
      setIsCreateModalOpen(false)
      await loadProjects()
    } catch {
      toast.error(t('projects.createFail'))
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setIsDetailsModalOpen(true)
  }

  const handleProjectUpdate = async () => {
    setIsDetailsModalOpen(false)
    await loadProjects()
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t('projects.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {t('projects.subtitle')}
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('projects.new')}
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">{t('projects.empty')}</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              {t('projects.emptyAction')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('projects.createTitle')}
      >
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onUpdate={handleProjectUpdate}
        />
      )}
    </Layout>
  )
}
