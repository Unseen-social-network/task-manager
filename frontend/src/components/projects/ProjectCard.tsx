import { Link2, Phone, FolderKanban } from 'lucide-react'
import type { Project } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLocale } from '@/contexts/localeContext'
import { truncate } from '@/utils/helpers'

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const { t } = useLocale()
  const linksCount = project.links?.length ?? 0

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {project.name}
          </h3>
          <Badge className="bg-primary-100 text-primary-700">
            <FolderKanban className="w-3 h-3 mr-1" />
            {t('projects.badge')}
          </Badge>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {truncate(project.description, 140)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {project.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{project.phone}</span>
            </div>
          )}
          {linksCount > 0 && (
            <div className="flex items-center gap-1">
              <Link2 className="w-4 h-4" />
              <span>
                {linksCount} {t('projects.linksCount')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
