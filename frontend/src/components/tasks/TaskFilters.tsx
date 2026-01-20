import { Search } from 'lucide-react'
import type { TaskFilters as TaskFiltersType } from '@/types'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLocale } from '@/contexts/localeContext'

interface TaskFiltersProps {
  filters: TaskFiltersType
  onChange: (filters: TaskFiltersType) => void
}

export const TaskFilters = ({ filters, onChange }: TaskFiltersProps) => {
  const { t } = useLocale()

  const handleFilterChange = (key: keyof TaskFiltersType, value: string) => {
    onChange({
      ...filters,
      [key]: value || undefined,
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          options={[
            { value: '', label: t('tasks.filter.statusAll') },
            { value: 'todo', label: t('tasks.filter.status.todo') },
            { value: 'in_progress', label: t('tasks.filter.status.in_progress') },
            { value: 'done', label: t('tasks.filter.status.done') },
            { value: 'canceled', label: t('tasks.filter.status.canceled') },
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
      </div>
    </div>
  )
}
