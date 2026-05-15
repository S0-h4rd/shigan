import { useMemo, useState } from 'react'
import Timeline from './components/Timeline'
import ReportView from './components/ReportView'
import ActiveTaskBar from './components/ActiveTaskBar'
import QuickStart from './components/QuickStart'
import PlanTaskPanel from './components/PlanTaskPanel'
import { useAppStore } from './store/useAppStore'
import { mockSchedule } from './data/mock'

function App() {
  const schedule = useAppStore((state) => state.schedule)
  const activeTaskId = useAppStore((state) => state.activeTaskId)
  const pausedTaskId = useAppStore((state) => state.pausedTaskId)
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)

  const displaySchedule =
    schedule.tasks.length > 0 ? schedule : mockSchedule

  const activeTask = useMemo(
    () => schedule.tasks.find((t) => t.id === activeTaskId),
    [schedule.tasks, activeTaskId],
  )

  const [showPlanPanel, setShowPlanPanel] = useState(false)

  const toggleView = () => {
    setView(view === 'timeline' ? 'report' : 'timeline')
  }

  return (
    <div className="min-h-screen bg-bg-base font-sans text-text-primary pb-32">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-border-light px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">今天</h1>
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
          <Timeline schedule={displaySchedule} onAddPlan={() => setShowPlanPanel(true)} />
        ) : (
          <ReportView schedule={displaySchedule} />
        )}
      </main>
      {!!activeTask || pausedTaskId !== null ? (
        <ActiveTaskBar task={activeTask || null} />
      ) : showPlanPanel ? (
        <PlanTaskPanel onClose={() => setShowPlanPanel(false)} />
      ) : (
        <QuickStart />
      )}
    </div>
  )
}

export default App
