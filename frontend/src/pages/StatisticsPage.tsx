import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { projectsService } from '@/services/projects.service'
import { statsService } from '@/services/stats.service'
import type { Project, TaskStatsFilters, TaskStatsResponse } from '@/types'

const formatDuration = (seconds: number) => {
  if (!seconds) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export const StatisticsPage = () => {
  const { t } = useLocale()
  const [filters, setFilters] = useState<TaskStatsFilters>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<TaskStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleFilterChange = <Key extends keyof TaskStatsFilters>(
    key: Key,
    value: TaskStatsFilters[Key]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }))
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
      await statsService.exportTaskStats(filters)
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
            <Input
              label={t('stats.filters.assignee')}
              placeholder="username"
              value={filters.tagged_user || ''}
              onChange={event => handleFilterChange('tagged_user', event.target.value)}
            />
            <Select
              label={t('stats.filters.status')}
              value={filters.status || ''}
              onChange={event => handleFilterChange('status', event.target.value || undefined)}
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
              onChange={event => handleFilterChange('urgency', event.target.value || undefined)}
              options={[
                { value: '', label: t('tasks.filter.urgencyAll') },
                { value: 'low', label: t('tasks.filter.urgency.low') },
                { value: 'medium', label: t('tasks.filter.urgency.medium') },
                { value: 'high', label: t('tasks.filter.urgency.high') },
                { value: 'critical', label: t('tasks.filter.urgency.critical') },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
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
                    {item.assignee_name}
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
                  <div className="w-24 text-xs text-gray-500 dark:text-gray-400">
                    {item.date}
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
