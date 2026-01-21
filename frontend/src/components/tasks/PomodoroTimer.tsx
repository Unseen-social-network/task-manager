import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RefreshCw, Coffee, Brain } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { formatDuration } from '@/utils/helpers'
import type { TaskMeta } from '@/types'

type PomodoroMode = 'focus' | 'break'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60
const FLASH_DURATION_MS = 12000
const FLASH_INTERVAL_MS = 1000

interface PomodoroTimerProps {
  isLocked?: boolean
  onUpdate: (updates: TaskMeta) => void
  currentSeconds?: number
  initialSessions?: number
  stopSignal?: number
  onRunningChange?: (isRunning: boolean) => void
}

export const PomodoroTimer = ({
  isLocked = false,
  onUpdate,
  currentSeconds = 0,
  initialSessions = 0,
  stopSignal = 0,
  onRunningChange,
}: PomodoroTimerProps) => {
  const { t } = useLocale()
  const [mode, setMode] = useState<PomodoroMode>('focus')
  const [remainingSeconds, setRemainingSeconds] = useState(FOCUS_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(initialSessions)
  const titleRef = useRef(typeof document !== 'undefined' ? document.title : '')
  const flashIntervalRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setSessionsCompleted(initialSessions)
  }, [initialSessions])

  useEffect(() => {
    if (!isRunning || isLocked) return
    const interval = window.setInterval(() => {
      setRemainingSeconds(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isRunning, isLocked])

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
    onRunningChange?.(isRunning && !isLocked)
  }, [isRunning, isLocked, onRunningChange])

  const stopFlashing = useCallback(() => {
    if (flashIntervalRef.current !== null) {
      window.clearInterval(flashIntervalRef.current)
      flashIntervalRef.current = null
    }
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = null
    }
    if (titleRef.current) {
      document.title = titleRef.current
    }
  }, [])

  const startFlashing = useCallback(
    (message: string) => {
      stopFlashing()
      let showAlert = false
      flashIntervalRef.current = window.setInterval(() => {
        document.title = showAlert ? titleRef.current : message
        showAlert = !showAlert
      }, FLASH_INTERVAL_MS)
      flashTimeoutRef.current = window.setTimeout(() => {
        stopFlashing()
      }, FLASH_DURATION_MS)
    },
    [stopFlashing]
  )

  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return
    const audioContextConstructor: (typeof AudioContext) | undefined =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!audioContextConstructor) return
    const audioContext = new audioContextConstructor()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gainNode.gain.value = 0.2
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.4)
    oscillator.onended = () => {
      audioContext.close()
    }
  }, [])

  const showBrowserNotification = useCallback((message: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(message)
      return
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(message)
        }
      })
    }
  }, [])

  const notifySessionComplete = useCallback(
    (completedMode: PomodoroMode) => {
      const sessionLabel =
        completedMode === 'focus' ? t('tasks.pomodoro.focus') : t('tasks.pomodoro.break')
      const message = `${t('tasks.pomodoro.title')}: ${sessionLabel} ${t(
        'tasks.pomodoro.complete'
      )}`
      playNotificationSound()
      startFlashing(message)
      showBrowserNotification(message)
    },
    [playNotificationSound, showBrowserNotification, startFlashing, t]
  )

  useEffect(() => {
    if (remainingSeconds !== 0) return
    setIsRunning(false)
    notifySessionComplete(mode)
    if (mode === 'focus') {
      setSessionsCompleted(prev => {
        const next = prev + 1
        onUpdate({ pomodoro_sessions: next, time_spent_seconds: currentSeconds + FOCUS_SECONDS })
        return next
      })
      setMode('break')
      setRemainingSeconds(BREAK_SECONDS)
    } else {
      setMode('focus')
      setRemainingSeconds(FOCUS_SECONDS)
    }
  }, [remainingSeconds, mode, notifySessionComplete, onUpdate, currentSeconds])

  useEffect(() => {
    return () => {
      stopFlashing()
    }
  }, [stopFlashing])

  const handleStartPause = () => {
    if (isLocked) return
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setMode('focus')
    setRemainingSeconds(FOCUS_SECONDS)
    setSessionsCompleted(0)
    onUpdate({ pomodoro_sessions: 0 })
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
