import { Search } from 'lucide-react'
import type { Project, TaskFilters as TaskFiltersType, TaskStatusOption } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLocale } from '@/contexts/localeContext'

interface TaskFiltersProps {
  filters: TaskFiltersType
  onChange: (filters: TaskFiltersType) => void
  statusOptions?: TaskStatusOption[]
  projects?: Project[]
  searchEverywhere: boolean
  onSearchEverywhereChange: (value: boolean) => void
}

export const TaskFilters = ({
  filters,
  onChange,
  statusOptions,
  projects = [],
  searchEverywhere,
  onSearchEverywhereChange,
}: TaskFiltersProps) => {
  const { t } = useLocale()
  const availableStatuses: TaskStatusOption[] =
    statusOptions ?? [
      { key: 'todo', label: t('status.todo'), order: 1, is_archived: false, is_done: false },
      { key: 'in_progress', label: t('status.in_progress'), order: 2, is_archived: false, is_done: false },
      { key: 'done', label: t('status.done'), order: 3, is_archived: true, is_done: true },
      { key: 'canceled', label: t('status.canceled'), order: 4, is_archived: true, is_done: false },
    ]

  const handleFilterChange = (key: keyof TaskFiltersType, value: string) => {
    const nextValue = (() => {
      if (key === 'project') {
        if (!value) return undefined
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }
      return value || undefined
    })()
    onChange({
      ...filters,
      [key]: nextValue,
    })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={t('tasks.searchPlaceholder')}
          value={filters.search || ''}
          onChange={e => handleFilterChange('search', e.target.value)}
          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={searchEverywhere}
          onChange={event => onSearchEverywhereChange(event.target.checked)}
          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        {t('tasks.filter.searchEverywhere')}
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={filters.search_in_description ?? false}
          onChange={event =>
            onChange({
              ...filters,
              search_in_description: event.target.checked ? true : undefined,
            })
          }
          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        {t('tasks.filter.searchInDescription')}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Select
          options={[
            { value: '', label: t('tasks.filter.statusAll') },
            ...availableStatuses.map(status => ({
              value: status.key,
              label: status.label,
            })),
          ]}
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
        />

        <Select
          options={[
            { value: '', label: t('tasks.filter.urgencyAll') },
            { value: 'low', label: t('tasks.filter.urgency.low') },
            { value: 'medium', label: t('tasks.filter.urgency.medium') },
            { value: 'high', label: t('tasks.filter.urgency.high') },
            { value: 'critical', label: t('tasks.filter.urgency.critical') },
          ]}
          value={filters.urgency || ''}
          onChange={e => handleFilterChange('urgency', e.target.value)}
        />

        <Select
          options={[
            { value: '', label: t('tasks.filter.projectAll') },
            ...projects.map(project => ({
              value: String(project.id),
              label: project.name,
            })),
          ]}
          value={filters.project ? String(filters.project) : ''}
          onChange={e => handleFilterChange('project', e.target.value)}
        />

        <Select
          options={[
            { value: '', label: t('tasks.filter.sort') },
            { value: 'due_date', label: t('tasks.filter.sort.dueAsc') },
            { value: '-due_date', label: t('tasks.filter.sort.dueDesc') },
            { value: 'created_at', label: t('tasks.filter.sort.createdAsc') },
            { value: '-created_at', label: t('tasks.filter.sort.createdDesc') },
            { value: 'urgency', label: t('tasks.filter.sort.urgency') },
          ]}
          value={filters.ordering || ''}
          onChange={e => handleFilterChange('ordering', e.target.value)}
        />

        <Input
          type="date"
          placeholder={t('tasks.filter.dueDateFrom')}
          value={filters.due_date_from || ''}
          onChange={e => handleFilterChange('due_date_from', e.target.value)}
        />

        <Input
          type="date"
          placeholder={t('tasks.filter.dueDateTo')}
          value={filters.due_date_to || ''}
          onChange={e => handleFilterChange('due_date_to', e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span>
          {filters.search || filters.status || filters.urgency || filters.project
            ? t('tasks.filter.active')
            : t('tasks.filter.none')}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange({})}
        >
          {t('tasks.filter.clear')}
        </Button>
      </div>
    </div>
  )
}
