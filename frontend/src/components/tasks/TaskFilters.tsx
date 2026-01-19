import { Search } from 'lucide-react'
import type { TaskFilters as TaskFiltersType } from '@/types'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface TaskFiltersProps {
  filters: TaskFiltersType
  onChange: (filters: TaskFiltersType) => void
}

export const TaskFilters = ({ filters, onChange }: TaskFiltersProps) => {
  const handleFilterChange = (key: keyof TaskFiltersType, value: string) => {
    onChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={e => handleFilterChange('search', e.target.value)}
          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
            { value: 'canceled', label: 'Canceled' },
          ]}
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
        />

        <Select
          options={[
            { value: '', label: 'All Urgencies' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
          value={filters.urgency || ''}
          onChange={e => handleFilterChange('urgency', e.target.value)}
        />

        <Select
          options={[
            { value: '', label: 'Sort By' },
            { value: 'due_date', label: 'Due Date (Asc)' },
            { value: '-due_date', label: 'Due Date (Desc)' },
            { value: 'created_at', label: 'Created (Asc)' },
            { value: '-created_at', label: 'Created (Desc)' },
            { value: 'urgency', label: 'Urgency' },
          ]}
          value={filters.ordering || ''}
          onChange={e => handleFilterChange('ordering', e.target.value)}
        />

        <Input
          type="date"
          placeholder="Due date from"
          value={filters.due_date_from || ''}
          onChange={e => handleFilterChange('due_date_from', e.target.value)}
        />
      </div>
    </div>
  )
}
