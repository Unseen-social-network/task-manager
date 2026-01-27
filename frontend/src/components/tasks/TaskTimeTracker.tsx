import { useEffect, useState } from 'react'
import { Pause, Play, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { formatDuration } from '@/utils/helpers'
import type { TaskMeta } from '@/types'

interface TaskTimeTrackerProps {
  initialSeconds?: number
  isLocked?: boolean
  trackingCompleted?: boolean
  stopSignal?: number
  externalRunning?: boolean
  onRunningChange?: (isRunning: boolean) => void
  onUpdate: (updates: TaskMeta) => void
}

export const TaskTimeTracker = ({
  initialSeconds = 0,
  isLocked = false,
  trackingCompleted = false,
  stopSignal = 0,
  externalRunning = false,
  onRunningChange,
  onUpdate,
}: TaskTimeTrackerProps) => {
  const { t } = useLocale()
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(trackingCompleted)
  const isActive = (isRunning || externalRunning) && !isCompleted && !isLocked

  useEffect(() => {
    setIsCompleted(trackingCompleted)
    if (trackingCompleted) {
      setIsRunning(false)
    }
  }, [trackingCompleted])

  useEffect(() => {
    if (isLocked) {
      setIsRunning(false)
    }
  }, [isLocked])

  useEffect(() => {
    if (stopSignal === 0) return
    setIsRunning(false)
  }, [stopSignal])

  useEffect(() => {
    if (!isActive) return
    const interval = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isActive])

  useEffect(() => {
    onRunningChange?.(isActive)
  }, [isActive, onRunningChange])

  useEffect(() => {
    onUpdate({ time_spent_seconds: elapsedSeconds })
  }, [elapsedSeconds, onUpdate])

  const handleStart = () => {
    if (isLocked || isCompleted) return
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 dark:border-gray-800">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Timer className="w-4 h-4" />
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {t('tasks.tracker.title')}
        </span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {formatDuration(elapsedSeconds)}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={isActive ? handlePause : handleStart}
            disabled={isLocked || isCompleted}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                {t('tasks.tracker.pause')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {t('tasks.tracker.start')}
              </>
            )}
          </Button>
        </div>
      </div>

      {isLocked && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t('tasks.tracker.readOnly')}
        </p>
      )}

      {isCompleted && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {t('tasks.tracker.completed')}
        </p>
      )}

      {!isCompleted && elapsedSeconds === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('tasks.tracker.notStarted')}
        </p>
      )}
    </div>
  )
}
