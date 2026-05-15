import { useEffect, useMemo, useState } from 'react'
import Timeline from './components/Timeline'
import ReportView from './components/ReportView'
import ActiveTaskBar from './components/ActiveTaskBar'
import QuickStart from './components/QuickStart'
import PlanTaskPanel from './components/PlanTaskPanel'
import EndReminderModal from './components/EndReminderModal'
import BackfillPanel from './components/BackfillPanel'
import { useAppStore, todayKey } from './store/useAppStore'
import { useNow } from './hooks/useNow'
import { useNotifications } from './hooks/useNotifications'
import { mockSchedule } from './data/mock'

function App() {
  const schedule = useAppStore((state) => state.schedule)
  const activeTaskId = useAppStore((state) => state.activeTaskId)
  const pausedTaskId = useAppStore((state) => state.pausedTaskId)
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const endTask = useAppStore((state) => state.endTask)
  const extendTask = useAppStore((state) => state.extendTask)
  const deferTask = useAppStore((state) => state.deferTask)
  const currentDate = useAppStore((state) => state.currentDate)
  const setCurrentDate = useAppStore((state) => state.setCurrentDate)

  const todayStr = todayKey()
  const isToday = currentDate === todayStr

  const displaySchedule =
    isToday && schedule.tasks.length === 0 ? mockSchedule : schedule

  const dateLabel = useMemo(() => {
    if (isToday) return '今天'
    const [, m, d] = currentDate.split('-')
    return `${parseInt(m, 10)}月${parseInt(d, 10)}日`
  }, [currentDate, isToday])

  const goPrevDay = () => {
    const date = new Date(currentDate + 'T00:00:00')
    date.setDate(date.getDate() - 1)
    setCurrentDate(date.toISOString().slice(0, 10))
  }

  const goNextDay = () => {
    const date = new Date(currentDate + 'T00:00:00')
    date.setDate(date.getDate() + 1)
    setCurrentDate(date.toISOString().slice(0, 10))
  }

  const activeTask = useMemo(
    () => schedule.tasks.find((t) => t.id === activeTaskId),
    [schedule.tasks, activeTaskId],
  )

  const now = useNow(1000)
  const remainingMs = useMemo(() => {
    if (!activeTask?.scheduledEnd) return Infinity
    return activeTask.scheduledEnd.getTime() - now
  }, [activeTask?.scheduledEnd, now])

  const [showPlanPanel, setShowPlanPanel] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [dismissedTaskId, setDismissedTaskId] = useState<string | null>(null)
  const [backfillRange, setBackfillRange] = useState<{ start: Date; end: Date } | null>(null)

  const { notify, resetTag } = useNotifications()

  useEffect(() => {
    if (remainingMs <= 0 && activeTask && activeTask.id !== dismissedTaskId) {
      setShowEndModal(true)
      notify('时间到了', `任务 "${activeTask.title}" 计划时间已结束`, `end-${activeTask.id}`)
    }
  }, [remainingMs, activeTask, dismissedTaskId, notify])

  useEffect(() => {
    if (
      remainingMs > 0 &&
      remainingMs <= 5 * 60 * 1000 &&
      activeTask
    ) {
      notify('即将结束', `任务 "${activeTask.title}" 还剩 5 分钟`, `warning-${activeTask.id}`)
    }
  }, [remainingMs, activeTask, notify])

  useEffect(() => {
    setDismissedTaskId(null)
  }, [activeTaskId])

  useEffect(() => {
    if (activeTaskId) {
      resetTag(`end-${activeTaskId}`)
      resetTag(`warning-${activeTaskId}`)
    }
  }, [activeTaskId, resetTag])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (activeTask) {
          endTask()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTask, endTask])

  const toggleView = () => {
    setView(view === 'timeline' ? 'report' : 'timeline')
  }

  return (
    <div className="min-h-screen bg-bg-base font-sans text-text-primary pb-32">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-border-light px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevDay}
              className="p-1 text-text-muted hover:text-text-secondary transition-colors"
              aria-label="上一天"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-primary min-w-[4em] text-center">
              {dateLabel}
            </h1>
            <button
              onClick={goNextDay}
              className="p-1 text-text-muted hover:text-text-secondary transition-colors"
              aria-label="下一天"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {!isToday && (
              <button
                onClick={() => setCurrentDate(todayStr)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors ml-1"
              >
                今天
              </button>
            )}
          </div>
          <button
            onClick={toggleView}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            {view === 'timeline' ? '报告' : '时间线'}
          </button>
        </div>
      </header>
      <main className="py-4">
        {view === 'timeline' ? (
          <Timeline
            schedule={displaySchedule}
            onAddPlan={() => setShowPlanPanel(true)}
            onBackfill={(start, end) => setBackfillRange({ start, end })}
          />
        ) : (
          <ReportView schedule={displaySchedule} />
        )}
      </main>
      {!!activeTask || pausedTaskId !== null ? (
        <ActiveTaskBar task={activeTask || null} />
      ) : backfillRange ? (
        <BackfillPanel
          start={backfillRange.start}
          end={backfillRange.end}
          onClose={() => setBackfillRange(null)}
        />
      ) : showPlanPanel ? (
        <PlanTaskPanel onClose={() => setShowPlanPanel(false)} />
      ) : (
        <QuickStart />
      )}
      <EndReminderModal
        task={activeTask || null}
        isOpen={showEndModal}
        onClose={() => {
          setShowEndModal(false)
          if (activeTask) {
            setDismissedTaskId(activeTask.id)
          }
        }}
        onEnd={() => {
          endTask()
          setDismissedTaskId(null)
        }}
        onExtend={() => {
          extendTask(10)
          setDismissedTaskId(null)
        }}
        onDefer={() => {
          deferTask()
          setDismissedTaskId(null)
        }}
      />
    </div>
  )
}

export default App
