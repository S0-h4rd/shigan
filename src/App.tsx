import { useState, useCallback } from 'react'
import Timeline from './components/Timeline'
import ReportView from './components/ReportView'
import ActiveTaskBar from './components/ActiveTaskBar'
import QuickStart from './components/QuickStart'
import PlanTaskPanel from './components/PlanTaskPanel'
import EndReminderModal from './components/EndReminderModal'
import BackfillPanel from './components/BackfillPanel'
import { useAppStore, todayKey } from './store/useAppStore'
import { getActiveTask, getPausedTask } from './store/useAppStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useEndReminder } from './hooks/useEndReminder'
import { formatMonthDayLabel, shiftDateKey } from './core/date'

function App() {
  const schedule = useAppStore((state) => state.schedule)
  const view = useAppStore((state) => state.view)
  const _state = useAppStore()
  const activeTask = getActiveTask(_state)
  const pausedTask = getPausedTask(_state)
  const setView = useAppStore((state) => state.setView)
  const endTask = useAppStore((state) => state.endTask)
  const extendTask = useAppStore((state) => state.extendTask)
  const deferTask = useAppStore((state) => state.deferTask)
  const currentDate = useAppStore((state) => state.currentDate)
  const setCurrentDate = useAppStore((state) => state.setCurrentDate)

  const todayStr = todayKey()
  const isToday = currentDate === todayStr

  const dateLabel = isToday ? '今天' : formatMonthDayLabel(currentDate)

  const taskCount = schedule.tasks.length
  const interruptionCount = schedule.interruptions.length
  const headerCaption =
    taskCount === 0
      ? '还没有开始记录'
      : `${taskCount} 项任务 · ${interruptionCount} 次打断`

  const [showPlanPanel, setShowPlanPanel] = useState(false)
  const [backfillRange, setBackfillRange] = useState<{
    start: Date
    end: Date
  } | null>(null)

  const {
    isOpen: showEndModal,
    onDismiss,
    reset,
  } = useEndReminder(activeTask)

  const handleSpace = useCallback(() => {
    if (activeTask) endTask()
  }, [activeTask, endTask])

  useKeyboardShortcuts(handleSpace)

  const toggleView = () => {
    setView(view === 'timeline' ? 'report' : 'timeline')
  }

  return (
    <div className="min-h-screen bg-bg-base font-sans text-text-primary pb-32">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-border-light px-4 py-3">
        <div className="max-w-[960px] mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentDate(shiftDateKey(currentDate, -1))
                }
                className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                aria-label="上一天"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="min-w-[5.5rem]">
                <h1 className="text-lg font-semibold text-text-primary text-center xl:text-left">
                  {dateLabel}
                </h1>
                <p className="text-xs text-text-muted text-center xl:text-left">
                  {headerCaption}
                </p>
              </div>
              <button
                onClick={() =>
                  setCurrentDate(shiftDateKey(currentDate, 1))
                }
                className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                aria-label="下一天"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
          </div>
          <button
            onClick={toggleView}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors xl:hidden"
          >
            {view === 'timeline' ? '报告' : '时间线'}
          </button>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-4 py-4 xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] xl:gap-6">
        <section
          className={view === 'report' ? 'hidden xl:block' : ''}
        >
          <Timeline
            schedule={schedule}
            onAddPlan={() => setShowPlanPanel(true)}
            onBackfill={(start, end) =>
              setBackfillRange({ start, end })
            }
          />
        </section>
        <aside
          className={
            view === 'timeline'
              ? 'hidden xl:block xl:sticky xl:top-24 self-start rounded-xl border border-border-light bg-bg-base'
              : ''
          }
        >
          <ReportView
            schedule={schedule}
            variant={view === 'timeline' ? 'panel' : 'full'}
          />
        </aside>
      </main>

      {showPlanPanel ? (
        <PlanTaskPanel onClose={() => setShowPlanPanel(false)} />
      ) : backfillRange ? (
        <BackfillPanel
          start={backfillRange.start}
          end={backfillRange.end}
          onClose={() => setBackfillRange(null)}
        />
      ) : activeTask || pausedTask ? (
        <ActiveTaskBar task={activeTask} />
      ) : (
        <QuickStart />
      )}

      <EndReminderModal
        task={activeTask}
        isOpen={showEndModal}
        onClose={onDismiss}
        onEnd={() => {
          endTask()
          reset()
        }}
        onExtend={() => {
          extendTask(10)
          reset()
        }}
        onDefer={() => {
          deferTask()
          reset()
        }}
      />
    </div>
  )
}

export default App
