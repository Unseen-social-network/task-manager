import { useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import type { Task } from '@/types'
import { useLocale } from '@/contexts/localeContext'
import { cn, formatDateOnly, getStatusColor, getUrgencyColor } from '@/utils/helpers'
import {
  getTaskAssignee,
  isTaskAtRisk,
  isTaskBlocked,
  isTaskNeedsReview,
  isTaskOverdue,
} from '@/utils/taskInsights'

export type QuickFilter = 'all' | 'overdue' | 'blocked' | 'needs_review' | 'at_risk'

interface ManagerDashboardProps {
  tasks: Task[]
  assigneeFilter: string
  onAssigneeChange: (value: string) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (value: QuickFilter) => void
}

export const ManagerDashboard = ({
  tasks,
  assigneeFilter,
  onAssigneeChange,
  quickFilter,
  onQuickFilterChange,
}: ManagerDashboardProps) => {
  const { t, locale } = useLocale()
  const unassignedLabel = t('tasks.dashboard.unassigned')

  const formatTaskCount = (count: number) => {
    if (locale === 'ru') {
      const mod10 = count % 10
      const mod100 = count % 100
      const noun =
        mod10 === 1 && mod100 !== 11
          ? 'задача'
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
            ? 'задачи'
            : 'задач'
      return `${count} ${noun}`
    }
    return `${count} ${count === 1 ? 'task' : 'tasks'}`
  }

  const formatPersonCount = (count: number) => {
    if (locale === 'ru') {
      const mod10 = count % 10
      const mod100 = count % 100
      const noun =
        mod10 === 1 && mod100 !== 11
          ? 'сотрудник'
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
            ? 'сотрудника'
            : 'сотрудников'
      return `${count} ${noun}`
    }
    return `${count} ${count === 1 ? 'employee' : 'employees'}`
  }
  const activeTasks = useMemo(
    () => tasks.filter(task => !['done', 'canceled'].includes(task.status)),
    [tasks]
  )

  const overdueTasks = useMemo(() => activeTasks.filter(isTaskOverdue), [activeTasks])
  const blockedTasks = useMemo(() => activeTasks.filter(isTaskBlocked), [activeTasks])
  const reviewTasks = useMemo(() => activeTasks.filter(isTaskNeedsReview), [activeTasks])
  const atRiskTasks = useMemo(() => activeTasks.filter(isTaskAtRisk), [activeTasks])

  const assigneeSummary = useMemo(() => {
    const counts = new Map<string, number>()
    activeTasks.forEach(task => {
      const assignee = getTaskAssignee(task, unassignedLabel)
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [activeTasks])

  const overloadedThreshold = 6
  const availableThreshold = 2
  const maxAssigneeCount = Math.max(1, ...assigneeSummary.map(item => item.count))

  const overloadedAssignees = assigneeSummary.filter(item => item.count >= overloadedThreshold)
  const availableAssignees = assigneeSummary.filter(item => item.count <= availableThreshold)

  const alertTasks = useMemo(() => {
    const prioritized = [
      ...overdueTasks.map(task => ({
        task,
        label: t('tasks.dashboard.alerts.overdue'),
        tone: 'danger' as const,
      })),
      ...blockedTasks.map(task => ({
        task,
        label: t('tasks.dashboard.alerts.blocked'),
        tone: 'warning' as const,
      })),
      ...reviewTasks.map(task => ({
        task,
        label: t('tasks.dashboard.alerts.needsReview'),
        tone: 'primary' as const,
      })),
      ...atRiskTasks.map(task => ({
        task,
        label: t('tasks.dashboard.alerts.atRisk'),
        tone: 'warning' as const,
      })),
    ]
    const seen = new Set<number>()
    return prioritized.filter(({ task }) => {
      if (seen.has(task.id)) return false
      seen.add(task.id)
      return true
    })
  }, [overdueTasks, blockedTasks, reviewTasks, atRiskTasks])

  const quickFilters = [
    { id: 'all' as const, label: t('tasks.dashboard.filter.all'), count: activeTasks.length },
    {
      id: 'overdue' as const,
      label: t('tasks.dashboard.filter.overdue'),
      count: overdueTasks.length,
    },
    {
      id: 'at_risk' as const,
      label: t('tasks.dashboard.filter.atRisk'),
      count: atRiskTasks.length,
    },
    {
      id: 'blocked' as const,
      label: t('tasks.dashboard.filter.blocked'),
      count: blockedTasks.length,
    },
    {
      id: 'needs_review' as const,
      label: t('tasks.dashboard.filter.needsReview'),
      count: reviewTasks.length,
    },
  ]

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.kpi.active')}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {activeTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatTaskCount(atRiskTasks.length)} {t('tasks.dashboard.kpi.atRisk')}
              </p>
            </div>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.kpi.overdue')}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {overdueTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatTaskCount(blockedTasks.length)} {t('tasks.dashboard.kpi.blocked')}
              </p>
            </div>
            <div className="p-2 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.kpi.needsReview')}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {reviewTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPersonCount(availableAssignees.length)} {t('tasks.dashboard.kpi.available')}
              </p>
            </div>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.kpi.overloaded')}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {overloadedAssignees.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPersonCount(assigneeSummary.length)} {t('tasks.dashboard.kpi.assignees')}
              </p>
            </div>
            <div className="p-2 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('tasks.dashboard.workload.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.workload.subtitle')}
              </p>
            </div>
            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {activeTasks.length} {t('tasks.dashboard.workload.activeCount')}
            </Badge>
          </div>

          <div className="space-y-3">
            {assigneeSummary.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.workload.empty')}
              </p>
            ) : (
              assigneeSummary.slice(0, 8).map(item => {
                const ratio = (item.count / maxAssigneeCount) * 100
                const statusLabel =
                  item.count >= overloadedThreshold
                    ? t('tasks.dashboard.workload.status.overloaded')
                    : item.count <= availableThreshold
                      ? t('tasks.dashboard.workload.status.available')
                      : t('tasks.dashboard.workload.status.balanced')
                const tone =
                  item.count >= overloadedThreshold
                    ? 'bg-red-500'
                    : item.count <= availableThreshold
                      ? 'bg-emerald-500'
                      : 'bg-primary-500'

                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {item.name}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={cn('h-2 rounded-full', tone)}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">{item.count}</span>
                      <Badge
                        className={cn(
                          item.count >= overloadedThreshold && 'bg-red-100 text-red-700',
                          item.count <= availableThreshold && 'bg-emerald-100 text-emerald-700'
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('tasks.dashboard.filters.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('tasks.dashboard.filters.subtitle')}
            </p>
          </div>

          <Select
            label={t('tasks.dashboard.filters.assignee')}
            options={[
              { value: '', label: t('tasks.dashboard.filters.assigneeAll') },
              ...assigneeSummary.map(assignee => ({
                value: assignee.name,
                label: `${assignee.name} (${assignee.count})`,
              })),
            ]}
            value={assigneeFilter}
            onChange={event => onAssigneeChange(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {quickFilters.map(filter => (
              <Button
                key={filter.id}
                size="sm"
                variant={quickFilter === filter.id ? 'primary' : 'secondary'}
                onClick={() => onQuickFilterChange(filter.id)}
              >
                <Filter className="w-3 h-3 mr-2" />
                {filter.label} ({filter.count})
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('tasks.dashboard.alerts.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.dashboard.alerts.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <ShieldAlert className="w-4 h-4" />
              {alertTasks.length} {t('tasks.dashboard.alerts.count')}
            </div>
          </div>

          <div className="space-y-3">
            {alertTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('tasks.dashboard.alerts.empty')}
              </div>
            ) : (
              alertTasks.slice(0, 6).map(({ task, label, tone }) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {task.title}
                    </div>
                    <Badge
                      className={cn(
                        tone === 'danger' && 'bg-red-100 text-red-700',
                        tone === 'warning' && 'bg-orange-100 text-orange-700',
                        tone === 'primary' && 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {t('tasks.dashboard.alerts.owner')}: {getTaskAssignee(task, unassignedLabel)}
                    </span>
                    {task.due_date && (
                      <span>
                        {t('tasks.dashboard.alerts.due')}: {formatDateOnly(task.due_date)}
                      </span>
                    )}
                    <Badge className={getUrgencyColor(task.urgency)}>{task.urgency}</Badge>
                    <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('tasks.dashboard.insights.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('tasks.dashboard.insights.subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />
              <div>
                <p className="font-semibold">{t('tasks.dashboard.insights.riskTitle')}</p>
                <p>
                  {formatTaskCount(atRiskTasks.length)} {t('tasks.dashboard.insights.riskBody')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <Flame className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold">{t('tasks.dashboard.insights.overloadedTitle')}</p>
                <p>
                  {overloadedAssignees.length === 0
                    ? t('tasks.dashboard.insights.overloadedEmpty')
                    : `${t('tasks.dashboard.insights.overloadedList')}: ${overloadedAssignees
                        .slice(0, 3)
                        .map(item => item.name)
                        .join(', ')}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-semibold">{t('tasks.dashboard.insights.reviewTitle')}</p>
                <p>
                  {formatTaskCount(reviewTasks.length)} {t('tasks.dashboard.insights.reviewBody')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
