import { useEffect, useState } from 'react'
import { Pause, Play, RefreshCw, Coffee, Brain } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { formatDuration } from '@/utils/helpers'
import type { TaskMeta } from '@/types'

type PomodoroMode = 'focus' | 'break'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

interface PomodoroTimerProps {
  isLocked?: boolean
  onUpdate: (updates: TaskMeta) => void
  currentSeconds?: number
}

export const PomodoroTimer = ({ isLocked = false, onUpdate, currentSeconds = 0 }: PomodoroTimerProps) => {
  const { t } = useLocale()
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [remainingSeconds, setRemainingSeconds] = useState(FOCUS_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)

  useEffect(() => {
    if (!isRunning || isLocked) return
    const interval = window.setInterval(() => {
      setRemainingSeconds(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isRunning, isLocked])

  useEffect(() => {
    if (remainingSeconds !== 0) return
    setIsRunning(false)
    if (mode === 'focus') {
      setSessionsCompleted(prev => prev + 1)
      onUpdate({ time_spent_seconds: currentSeconds + FOCUS_SECONDS })
      setMode('break')
      setRemainingSeconds(BREAK_SECONDS)
    } else {
      setMode('focus')
      setRemainingSeconds(FOCUS_SECONDS)
    }
  }, [remainingSeconds, mode, onUpdate, currentSeconds])

  const handleStartPause = () => {
    if (isLocked) return
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setMode('focus')
    setRemainingSeconds(FOCUS_SECONDS)
    setSessionsCompleted(0)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 dark:border-gray-800">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {mode === 'focus' ? <Brain className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {t('tasks.pomodoro.title')}
        </span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'focus' ? t('tasks.pomodoro.focus') : t('tasks.pomodoro.break')}
          </div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatDuration(remainingSeconds)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('tasks.pomodoro.sessions')}: {sessionsCompleted}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartPause}
            disabled={isLocked}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                {t('tasks.pomodoro.pause')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {t('tasks.pomodoro.start')}
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} disabled={isLocked}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tasks.pomodoro.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}
