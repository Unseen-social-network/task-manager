import { useCallback, useEffect, useMemo, useState, type FocusEvent } from 'react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { contactsService } from '@/services/contacts.service'
import { projectsService } from '@/services/projects.service'
import { statsService } from '@/services/stats.service'
import type { Contact, Project, TaskStatsFilters, TaskStatsResponse } from '@/types'
import type { TaskUrgency, TaskStatus } from '@/types'

const formatDuration = (seconds: number) => {
  if (!seconds) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const StatisticsPage = () => {
  const { t, locale } = useLocale()
  const [filters, setFilters] = useState<TaskStatsFilters>({})
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<TaskStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false)

  const formatDeadlineLabel = useCallback(
    (dateString: string) => {
      try {
        const parsedDate = parseISO(dateString)
        const weekdayLabel =
          locale === 'ru'
            ? ['вс.', 'пн.', 'вт.', 'ср.', 'чт.', 'пт.', 'сб.'][parsedDate.getDay()]
            : format(parsedDate, 'EEE', { locale: enUS })
        return `${weekdayLabel} | ${format(parsedDate, 'dd - MMM', {
          locale: locale === 'ru' ? ru : enUS,
        })}`
      } catch {
        return dateString
      }
    },
    [locale]
  )

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await statsService.getTaskStats(filters)
      setStats(response)
    } catch {
      toast.error(t('tasks.loadFail'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, t])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    let isActive = true
    const loadProjects = async () => {
      try {
        const response = await projectsService.getProjects()
        if (!isActive) return
        setProjects(response.results)
      } catch {
        if (!isActive) return
        toast.error(t('projects.loadFail'))
      }
    }
    loadProjects()
    return () => {
      isActive = false
    }
  }, [t])

  useEffect(() => {
    let isActive = true
    const loadContacts = async () => {
      try {
        const response = await contactsService.getContacts()
        if (!isActive) return
        setContacts(response.results)
      } catch {
        if (!isActive) return
        toast.error(t('contacts.loadFail'))
      }
    }
    loadContacts()
    return () => {
      isActive = false
    }
  }, [t])

  const handleFilterChange = <Key extends keyof TaskStatsFilters>(
    key: Key,
    value: TaskStatsFilters[Key]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }))
  }

  const applyDueDateRange = useCallback((start: Date, end: Date) => {
    setFilters(prev => ({
      ...prev,
      due_date_from: formatDateInputValue(start),
      due_date_to: formatDateInputValue(end),
    }))
  }, [])

  const handleQuickDeadline = useCallback(
    (preset: 'thisWeek' | 'lastTwoWeeks' | 'thisMonth' | 'thisQuarter') => {
      const today = new Date()
      if (preset === 'thisWeek') {
        const dayOffset = (today.getDay() + 6) % 7
        const start = new Date(today)
        start.setDate(today.getDate() - dayOffset)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        applyDueDateRange(start, end)
        return
      }
      if (preset === 'lastTwoWeeks') {
        const start = new Date(today)
        start.setDate(today.getDate() - 13)
        applyDueDateRange(start, today)
        return
      }
      if (preset === 'thisMonth') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        applyDueDateRange(start, end)
        return
      }
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
      const start = new Date(today.getFullYear(), quarterStartMonth, 1)
      const end = new Date(today.getFullYear(), quarterStartMonth + 3, 0)
      applyDueDateRange(start, end)
    },
    [applyDueDateRange]
  )

  const formatContactLabel = (contact: Contact) => {
    if (!contact.username) return contact.name
    return `${contact.name} (@${contact.username})`
  }

  const taggableContacts = useMemo(
    () => contacts.filter(contact => contact.username),
    [contacts]
  )

  const filteredTaggableContacts = useMemo(() => {
    const normalizedQuery = assigneeSearch.trim().toLowerCase()
    if (!normalizedQuery) return taggableContacts
    return taggableContacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(normalizedQuery)
      const usernameMatch = contact.username?.toLowerCase().includes(normalizedQuery)
      const labelMatch = formatContactLabel(contact).toLowerCase().includes(normalizedQuery)
      return nameMatch || usernameMatch || labelMatch
    })
  }, [assigneeSearch, taggableContacts])

  useEffect(() => {
    if (!filters.tagged_user) {
      if (assigneeSearch) {
        setAssigneeSearch('')
      }
      return
    }
    const matchedContact = taggableContacts.find(
      contact => contact.username === filters.tagged_user
    )
    if (matchedContact) {
      setAssigneeSearch(formatContactLabel(matchedContact))
    } else {
      setAssigneeSearch(filters.tagged_user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.tagged_user, taggableContacts])

  const handleAssigneeSelect = (username: string, label: string) => {
    handleFilterChange('tagged_user', username)
    setAssigneeSearch(label)
    setIsAssigneeMenuOpen(false)
  }

  const handleAssigneeBlur = (event: FocusEvent<HTMLInputElement>) => {
    const enteredValue = event.target.value.trim()
    if (!enteredValue) {
      handleFilterChange('tagged_user', undefined)
      setAssigneeSearch('')
      setTimeout(() => setIsAssigneeMenuOpen(false), 100)
      return
    }
    const matchedContact = taggableContacts.find(contact => {
      const nameMatch = contact.name.toLowerCase() === enteredValue.toLowerCase()
      const usernameMatch = contact.username?.toLowerCase() === enteredValue.toLowerCase()
      const labelMatch =
        formatContactLabel(contact).toLowerCase() === enteredValue.toLowerCase()
      return nameMatch || usernameMatch || labelMatch
    })
    const username = matchedContact?.username ?? enteredValue
    handleFilterChange('tagged_user', username)
    if (matchedContact) {
      setAssigneeSearch(formatContactLabel(matchedContact))
    }
    setTimeout(() => setIsAssigneeMenuOpen(false), 100)
  }

  const metrics = stats?.metrics
  const series = stats?.series
  const maxStatus = useMemo(() => {
    if (!series?.by_status.length) return 0
    return Math.max(...series.by_status.map(item => item.count))
  }, [series?.by_status])
  const maxUrgency = useMemo(() => {
    if (!series?.by_urgency.length) return 0
    return Math.max(...series.by_urgency.map(item => item.count))
  }, [series?.by_urgency])
  const maxTrend = useMemo(() => {
    if (!series?.due_date_trend.length) return 0
    return Math.max(...series.due_date_trend.map(item => item.count))
  }, [series?.due_date_trend])

  const handleExport = async () => {
    try {
      await statsService.exportTaskStats(filters, locale)
    } catch {
      toast.error(t('stats.exportFail'))
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('stats.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('stats.subtitle')}
            </p>
          </div>
          <Button onClick={handleExport}>{t('stats.export')}</Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.filters.title')}
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Select
              label={t('stats.filters.project')}
              value={filters.project ? String(filters.project) : ''}
              onChange={event =>
                handleFilterChange(
                  'project',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
              options={[
                { value: '', label: t('tasks.filter.projectAll') },
                ...projects.map(project => ({
                  value: String(project.id),
                  label: project.name,
                })),
              ]}
            />
            <div className="relative">
              <Input
                label={t('stats.filters.assignee')}
                placeholder={t('tasks.form.taggedPlaceholder')}
                autoComplete="off"
                value={assigneeSearch}
                onFocus={() => setIsAssigneeMenuOpen(true)}
                onChange={event => {
                  const value = event.target.value
                  setAssigneeSearch(value)
                  setIsAssigneeMenuOpen(true)
                  if (!value.trim()) {
                    handleFilterChange('tagged_user', undefined)
                  }
                }}
                onBlur={handleAssigneeBlur}
              />
              {isAssigneeMenuOpen && filteredTaggableContacts.length > 0 && (
                <div className="absolute z-20 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <ul className="max-h-48 overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200">
                    {filteredTaggableContacts.map(contact => {
                      if (!contact.username) return null
                      const label = formatContactLabel(contact)
                      return (
                        <li key={contact.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                            onMouseDown={event => {
                              event.preventDefault()
                              handleAssigneeSelect(contact.username, label)
                            }}
                          >
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              @{contact.username}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
            <Select
              label={t('stats.filters.status')}
              value={filters.status || ''}
              onChange={event => handleFilterChange('status', event.target.value as TaskStatus || undefined)}
              options={[
                { value: '', label: t('tasks.filter.statusAll') },
                { value: 'todo', label: t('status.todo') },
                { value: 'in_progress', label: t('status.in_progress') },
                { value: 'done', label: t('status.done') },
                { value: 'canceled', label: t('status.canceled') },
              ]}
            />
            <Select
              label={t('stats.filters.urgency')}
              value={filters.urgency || ''}
              onChange={event => handleFilterChange('urgency', event.target.value as TaskUrgency || undefined)}
              options={[
                { value: '', label: t('tasks.filter.urgencyAll') },
                { value: 'low', label: t('tasks.filter.urgency.low') },
                { value: 'medium', label: t('tasks.filter.urgency.medium') },
                { value: 'high', label: t('tasks.filter.urgency.high') },
                { value: 'critical', label: t('tasks.filter.urgency.critical') },
              ]}
            />
            <div className="grid grid-cols-2 gap-2 xl:col-span-2">
              <Input
                type="date"
                label={t('stats.filters.deadlineFrom')}
                value={filters.due_date_from || ''}
                onChange={event => handleFilterChange('due_date_from', event.target.value)}
              />
              <Input
                type="date"
                label={t('stats.filters.deadlineTo')}
                value={filters.due_date_to || ''}
                onChange={event => handleFilterChange('due_date_to', event.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('stats.filters.quickDeadline')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleQuickDeadline('thisWeek')}
              >
                {t('stats.filters.quick.thisWeek')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleQuickDeadline('lastTwoWeeks')}
              >
                {t('stats.filters.quick.lastTwoWeeks')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleQuickDeadline('thisMonth')}
              >
                {t('stats.filters.quick.thisMonth')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleQuickDeadline('thisQuarter')}
              >
                {t('stats.filters.quick.thisQuarter')}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            {
              label: t('stats.metrics.total'),
              value: metrics?.total ?? 0,
            },
            {
              label: t('stats.metrics.completed'),
              value: metrics?.completed ?? 0,
            },
            {
              label: t('stats.metrics.completionRate'),
              value: `${metrics?.completion_rate ?? 0}%`,
            },
            {
              label: t('stats.metrics.overdue'),
              value: metrics?.overdue ?? 0,
            },
            {
              label: t('stats.metrics.avgCompletion'),
              value: formatDuration(metrics?.avg_completion_seconds ?? 0),
            },
          ].map(item => (
            <Card key={item.label} className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {isLoading ? '—' : item.value}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.chart.status')}
            </h3>
            <div className="mt-4 space-y-3">
              {series?.by_status.map(item => (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>{t(`status.${item.status}`)}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{
                        width: maxStatus ? `${(item.count / maxStatus) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.chart.urgency')}
            </h3>
            <div className="mt-4 space-y-3">
              {series?.by_urgency.map(item => (
                <div key={item.urgency} className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>{t(`urgency.${item.urgency}`)}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: maxUrgency ? `${(item.count / maxUrgency) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.chart.assigneeLoad')}
            </h3>
            <div className="mt-4 space-y-3">
              {series?.by_assignee.map(item => (
                <div
                  key={`${item.assignee_id ?? 'none'}-${item.assignee_name}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {item.assignee_id
                      ? item.assignee_name
                      : t('tasks.dashboard.unassigned')}
                  </div>
                  <div className="flex gap-3">
                    <span>Total: {item.total}</span>
                    <span>Done: {item.done}</span>
                    <span>Overdue: {item.overdue}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('stats.chart.dueDates')}
            </h3>
            <div className="mt-4 space-y-2">
              {series?.due_date_trend.map(item => (
                <div key={item.date} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-gray-500 dark:text-gray-400">
                    {formatDeadlineLabel(item.date)}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-orange-500"
                      style={{
                        width: maxTrend ? `${(item.count / maxTrend) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
