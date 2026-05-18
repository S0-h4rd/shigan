# 今日报告 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the daily report view showing time statistics, completion rates, category breakdown, and interruption sources.

**Architecture:** A pure data function `generateTimeInsight` computes all statistics from `DaySchedule`. A presentational `ReportView` component renders the report with pure CSS charts. `App.tsx` toggles between `Timeline` and `ReportView` via the existing `view` state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/core/report.ts` | Pure function `generateTimeInsight` — all data calculations |
| `src/core/report.test.ts` | Unit tests for `generateTimeInsight` |
| `src/components/ReportView.tsx` | Presentational component for the report UI |
| `src/components/ReportView.test.tsx` | Component render tests |
| `src/App.tsx` | Wire up view toggle and conditional rendering |

---

## Task 1: `generateTimeInsight` Data Function

**Files:**
- Create: `src/core/report.ts`
- Test: `src/core/report.test.ts`

### Step 1: Write the failing test

```typescript
import { describe, expect, it } from 'vitest'
import { generateTimeInsight } from './report'
import type { DaySchedule, Task } from '@/types'

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    plannedDurationMinutes: 30,
    status: 'scheduled',
    priority: 'medium',
    revisionCount: 0,
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<DaySchedule> = {}): DaySchedule {
  return {
    date: '2026-05-15',
    tasks: [],
    interruptions: [],
    ...overrides,
  }
}

describe('generateTimeInsight', () => {
  it('returns zeros for empty schedule', () => {
    const schedule = makeSchedule()
    const result = generateTimeInsight(schedule)
    expect(result.totalPlannedMinutes).toBe(0)
    expect(result.totalActualMinutes).toBe(0)
    expect(result.totalInterruptionMinutes).toBe(0)
    expect(result.completedTasks).toBe(0)
    expect(result.cancelledTasks).toBe(0)
    expect(result.deferredTasks).toBe(0)
    expect(result.categoryBreakdown).toEqual({})
    expect(result.revisionCount).toBe(0)
  })

  it('sums planned minutes for non-cancelled tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', plannedDurationMinutes: 30, status: 'scheduled' }),
        makeTask({ id: 'b', title: 'Task B', plannedDurationMinutes: 45, status: 'cancelled' }),
        makeTask({ id: 'c', title: 'Task C', plannedDurationMinutes: 60, status: 'completed' }),
      ],
    })
    const result = generateTimeInsight(schedule)
    expect(result.totalPlannedMinutes).toBe(90) // 30 + 60
  })

  it('sums actual minutes for completed and active tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed', actualDurationMinutes: 25 }),
        makeTask({ id: 'b', title: 'Task B', status: 'active', actualDurationMinutes: 10 }),
        makeTask({ id: 'c', title: 'Task C', status: 'scheduled', actualDurationMinutes: undefined }),
      ],
    })
    const result = generateTimeInsight(schedule)
    expect(result.totalActualMinutes).toBe(35)
  })

  it('counts tasks by status', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed' }),
        makeTask({ id: 'b', title: 'Task B', status: 'cancelled' }),
        makeTask({ id: 'c', title: 'Task C', status: 'deferred' }),
        makeTask({ id: 'd', title: 'Task D', status: 'active' }),
      ],
    })
    const result = generateTimeInsight(schedule)
    expect(result.completedTasks).toBe(1)
    expect(result.cancelledTasks).toBe(1)
    expect(result.deferredTasks).toBe(1)
  })

  it('sums revision counts', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', revisionCount: 2 }),
        makeTask({ id: 'b', title: 'Task B', revisionCount: 3 }),
      ],
    })
    const result = generateTimeInsight(schedule)
    expect(result.revisionCount).toBe(5)
  })

  it('builds category breakdown from actualDurationMinutes', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Work', status: 'completed', actualDurationMinutes: 30, category: '工作' }),
        makeTask({ id: 'b', title: 'More Work', status: 'completed', actualDurationMinutes: 20, category: '工作' }),
        makeTask({ id: 'c', title: 'Read', status: 'completed', actualDurationMinutes: 15, category: '学习' }),
        makeTask({ id: 'd', title: 'No Cat', status: 'completed', actualDurationMinutes: 10 }),
      ],
    })
    const result = generateTimeInsight(schedule)
    expect(result.categoryBreakdown).toEqual({
      '工作': 50,
      '学习': 15,
      '未分类': 10,
    })
  })

  it('calculates interruption minutes from completed interruption tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'main', title: 'Main', status: 'paused' }),
        makeTask({ id: 'int1', title: 'Interrupt 1', status: 'completed', actualDurationMinutes: 15 }),
        makeTask({ id: 'int2', title: 'Interrupt 2', status: 'completed', actualDurationMinutes: 20 }),
        makeTask({ id: 'int3', title: 'Interrupt 3', status: 'active', actualDurationMinutes: 5 }),
      ],
      interruptions: [
        { id: 'i1', timestamp: new Date(), interruptedTaskId: 'main', newTaskId: 'int1', description: 'Bug' },
        { id: 'i2', timestamp: new Date(), interruptedTaskId: 'main', newTaskId: 'int2', description: 'Meeting' },
        { id: 'i3', timestamp: new Date(), interruptedTaskId: 'main', newTaskId: 'int3', description: 'Chat' },
      ],
    })
    const result = generateTimeInsight(schedule)
    // Only completed interruption tasks count
    expect(result.totalInterruptionMinutes).toBe(35)
  })
})
```

Run: `npx vitest run src/core/report.test.ts`
Expected: FAIL — `generateTimeInsight` not found

### Step 2: Implement `generateTimeInsight`

```typescript
import type { DaySchedule, TimeInsight } from '@/types'

export function generateTimeInsight(schedule: DaySchedule): TimeInsight {
  const tasks = schedule.tasks

  const totalPlannedMinutes = tasks
    .filter((t) => t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.plannedDurationMinutes, 0)

  const totalActualMinutes = tasks
    .filter((t) => t.status === 'completed' || t.status === 'active')
    .reduce((sum, t) => sum + (t.actualDurationMinutes ?? 0), 0)

  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const cancelledTasks = tasks.filter((t) => t.status === 'cancelled').length
  const deferredTasks = tasks.filter((t) => t.status === 'deferred').length

  const categoryBreakdown: Record<string, number> = {}
  tasks
    .filter((t) => t.actualDurationMinutes != null)
    .forEach((t) => {
      const key = t.category || '未分类'
      categoryBreakdown[key] = (categoryBreakdown[key] || 0) + t.actualDurationMinutes!
    })

  const revisionCount = tasks.reduce((sum, t) => sum + t.revisionCount, 0)

  // Interruption minutes: find completed tasks referenced by interruptions
  const interruptionTaskIds = new Set(
    schedule.interruptions.map((i) => i.newTaskId),
  )
  const totalInterruptionMinutes = tasks
    .filter(
      (t) =>
        interruptionTaskIds.has(t.id) && t.status === 'completed',
    )
    .reduce((sum, t) => sum + (t.actualDurationMinutes ?? 0), 0)

  return {
    date: schedule.date,
    totalPlannedMinutes,
    totalActualMinutes,
    totalInterruptionMinutes,
    completedTasks,
    cancelledTasks,
    deferredTasks,
    categoryBreakdown,
    revisionCount,
  }
}
```

Run: `npx vitest run src/core/report.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/core/report.ts src/core/report.test.ts
git commit -m "feat: add generateTimeInsight for daily report statistics"
```

---

## Task 2: `ReportView` Component

**Files:**
- Create: `src/components/ReportView.tsx`
- Create: `src/components/ReportView.test.tsx`

### Step 1: Write the failing component test

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReportView from './ReportView'
import type { DaySchedule } from '@/types'

function makeSchedule(tasks: DaySchedule['tasks'] = [], interruptions: DaySchedule['interruptions'] = []): DaySchedule {
  return {
    date: '2026-05-15',
    tasks,
    interruptions,
  }
}

describe('ReportView', () => {
  it('renders empty state when no tasks', () => {
    render(<ReportView schedule={makeSchedule()} />)
    expect(screen.getByText('今天还没有记录')).toBeInTheDocument()
    expect(screen.getByText('点击时间线开始你的第一个任务')).toBeInTheDocument()
  })

  it('renders date title', () => {
    const schedule = makeSchedule([
      { id: '1', title: 'Task', plannedDurationMinutes: 30, status: 'completed', actualDurationMinutes: 30, priority: 'medium', revisionCount: 0 },
    ])
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('2026-05-15')).toBeInTheDocument()
  })

  it('renders metric cards', () => {
    const schedule = makeSchedule([
      { id: '1', title: 'Task', plannedDurationMinutes: 60, status: 'completed', actualDurationMinutes: 55, priority: 'medium', revisionCount: 0, category: '工作' },
    ])
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('计划时长')).toBeInTheDocument()
    expect(screen.getByText('实际时长')).toBeInTheDocument()
    expect(screen.getByText('打断时长')).toBeInTheDocument()
    expect(screen.getByText('空白时长')).toBeInTheDocument()
  })

  it('renders completion rate bar', () => {
    const schedule = makeSchedule([
      { id: '1', title: 'A', plannedDurationMinutes: 30, status: 'completed', actualDurationMinutes: 30, priority: 'medium', revisionCount: 0 },
      { id: '2', title: 'B', plannedDurationMinutes: 30, status: 'cancelled', priority: 'medium', revisionCount: 0 },
      { id: '3', title: 'C', plannedDurationMinutes: 30, status: 'scheduled', priority: 'medium', revisionCount: 0 },
    ])
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText(/1 项完成/)).toBeInTheDocument()
    expect(screen.getByText(/1 项跳过/)).toBeInTheDocument()
    expect(screen.getByText(/1 项进行中/)).toBeInTheDocument()
  })

  it('renders insight text', () => {
    const schedule = makeSchedule([
      { id: '1', title: 'A', plannedDurationMinutes: 30, status: 'completed', actualDurationMinutes: 30, priority: 'medium', revisionCount: 1 },
    ])
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText(/1 项任务按时完成/)).toBeInTheDocument()
    expect(screen.getByText(/计划被调整了 1 次/)).toBeInTheDocument()
  })

  it('renders interruption sources when present', () => {
    const schedule = makeSchedule(
      [
        { id: 'main', title: 'Main', plannedDurationMinutes: 30, status: 'paused', priority: 'medium', revisionCount: 0 },
        { id: 'int1', title: 'Bug', plannedDurationMinutes: 15, status: 'completed', actualDurationMinutes: 15, priority: 'medium', revisionCount: 0 },
      ],
      [
        { id: 'i1', timestamp: new Date(), interruptedTaskId: 'main', newTaskId: 'int1', description: '紧急bug' },
      ],
    )
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('主要打断来源')).toBeInTheDocument()
    expect(screen.getByText(/紧急bug/)).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/ReportView.test.tsx`
Expected: FAIL — `ReportView` not found

### Step 2: Implement `ReportView`

```tsx
import { useMemo } from 'react'
import type { DaySchedule, Task } from '@/types'
import { generateTimeInsight } from '@/core/report'

const HOUR_HEIGHT = 80
const START_HOUR = 6
const END_HOUR = 23

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function findBlankSlots(tasks: Task[]): { start: number; end: number }[] {
  const sorted = [...tasks]
    .filter((t) => t.scheduledStart && t.scheduledEnd)
    .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())

  const slots: { start: number; end: number }[] = []
  const dayStart = START_HOUR * 60
  const dayEnd = END_HOUR * 60

  if (sorted.length === 0) {
    slots.push({ start: dayStart, end: dayEnd })
    return slots
  }

  const firstStart = minutesFromMidnight(sorted[0].scheduledStart!)
  if (firstStart > dayStart) {
    slots.push({ start: dayStart, end: firstStart })
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const currEnd = minutesFromMidnight(sorted[i].scheduledEnd!)
    const nextStart = minutesFromMidnight(sorted[i + 1].scheduledStart!)
    if (nextStart > currEnd) {
      slots.push({ start: currEnd, end: nextStart })
    }
  }

  const lastEnd = minutesFromMidnight(sorted[sorted.length - 1].scheduledEnd!)
  if (lastEnd < dayEnd) {
    slots.push({ start: lastEnd, end: dayEnd })
  }

  return slots
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}时${mins}分` : `${hours}时`
  }
  return `${minutes}分`
}

interface ReportViewProps {
  schedule: DaySchedule
}

export default function ReportView({ schedule }: ReportViewProps) {
  const insight = useMemo(() => generateTimeInsight(schedule), [schedule])

  const blankMinutes = useMemo(() => {
    const slots = findBlankSlots(schedule.tasks)
    return slots.reduce((sum, s) => sum + (s.end - s.start), 0)
  }, [schedule.tasks])

  const totalTasks = schedule.tasks.length
  const completionPct = totalTasks > 0 ? (insight.completedTasks / totalTasks) * 100 : 0
  const skipPct = totalTasks > 0 ? (insight.cancelledTasks / totalTasks) * 100 : 0
  const remainingPct = Math.max(0, 100 - completionPct - skipPct)

  const interruptionSources = useMemo(() => {
    const taskMap = new Map(schedule.tasks.map((t) => [t.id, t]))
    const descMap = new Map<string, { count: number; duration: number }>()

    for (const interruption of schedule.interruptions) {
      const task = taskMap.get(interruption.newTaskId)
      if (!task || task.status !== 'completed') continue
      const existing = descMap.get(interruption.description)
      const duration = task.actualDurationMinutes ?? 0
      if (existing) {
        existing.count += 1
        existing.duration += duration
      } else {
        descMap.set(interruption.description, { count: 1, duration })
      }
    }

    return Array.from(descMap.entries()).sort((a, b) => b[1].duration - a[1].duration)
  }, [schedule])

  const insightParts: string[] = []
  if (insight.completedTasks > 0) {
    insightParts.push(`${insight.completedTasks} 项任务按时完成`)
  }
  if (insight.cancelledTasks > 0) {
    insightParts.push(`${insight.cancelledTasks} 项被跳过`)
  }
  if (insight.deferredTasks > 0) {
    insightParts.push(`${insight.deferredTasks} 项延后到明天`)
  }
  if (insight.revisionCount > 0) {
    insightParts.push(`计划被调整了 ${insight.revisionCount} 次`)
  }

  if (schedule.tasks.length === 0) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-12 text-center">
        <div className="text-4xl text-text-muted mb-4" aria-hidden="true">○</div>
        <p className="text-text-secondary font-medium">今天还没有记录</p>
        <p className="text-sm text-text-muted mt-1">点击时间线开始你的第一个任务</p>
      </div>
    )
  }

  const categoryEntries = Object.entries(insight.categoryBreakdown).sort(
    (a, b) => b[1] - a[1],
  )
  const maxCategoryMinutes = categoryEntries.length > 0 ? categoryEntries[0][1] : 1

  return (
    <div className="max-w-[480px] mx-auto px-4 py-4 space-y-6">
      {/* Date title */}
      <h2 className="text-lg font-semibold text-text-primary">{schedule.date}</h2>

      {/* Metric cards 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="计划时长" value={formatMinutes(insight.totalPlannedMinutes)} />
        <MetricCard label="实际时长" value={formatMinutes(insight.totalActualMinutes)} />
        <MetricCard label="打断时长" value={formatMinutes(insight.totalInterruptionMinutes)} />
        <MetricCard label="空白时长" value={formatMinutes(blankMinutes)} />
      </div>

      {/* Completion rate bar */}
      <div>
        <div className="h-4 rounded-full bg-bg-muted overflow-hidden flex">
          {completionPct > 0 && (
            <div
              className="h-full bg-active-bg"
              style={{ width: `${completionPct}%` }}
            />
          )}
          {skipPct > 0 && (
            <div
              className="h-full bg-done-bg"
              style={{ width: `${skipPct}%` }}
            />
          )}
          {remainingPct > 0 && (
            <div
              className="h-full bg-plan-bg"
              style={{ width: `${remainingPct}%` }}
            />
          )}
        </div>
        <p className="text-xs text-text-muted mt-2 text-center">
          {insight.completedTasks} 项完成 · {insight.cancelledTasks} 项跳过 · {totalTasks - insight.completedTasks - insight.cancelledTasks} 项进行中
        </p>
      </div>

      {/* Category breakdown */}
      {categoryEntries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">分类占比</h3>
          {categoryEntries.map(([category, minutes]) => (
            <div key={category} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-16 shrink-0 truncate">{category}</span>
              <div className="flex-1 h-2 rounded-full bg-bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-scheduled-text"
                  style={{ width: `${(minutes / maxCategoryMinutes) * 100}%` }}
                />
              </div>
              <span className="text-xs text-text-muted font-mono w-12 text-right shrink-0">
                {minutes}分
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Insight text */}
      {insightParts.length > 0 && (
        <p className="text-sm text-text-secondary">{insightParts.join(' · ')}</p>
      )}

      {/* Interruption sources */}
      {interruptionSources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">主要打断来源</h3>
          <div className="space-y-1.5">
            {interruptionSources.map(([description, { count, duration }]) => (
              <div
                key={description}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-primary">{description}</span>
                <span className="text-text-muted font-mono">
                  {count}次 · {duration}分钟
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-subtle border border-border-light rounded-lg px-3 py-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-xl font-mono font-tabular text-text-primary mt-1">{value}</div>
    </div>
  )
}
```

Run: `npx vitest run src/components/ReportView.test.tsx`
Expected: PASS

### Step 3: Commit

```bash
git add src/components/ReportView.tsx src/components/ReportView.test.tsx
git commit -m "feat: add ReportView component for daily statistics"
```

---

## Task 3: Wire Up View Toggle in `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (create if not exists, or add to existing)

### Step 1: Write the failing integration test

If `src/App.test.tsx` does not exist, create it:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

// Mock zustand persist middleware
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}))

describe('App view toggle', () => {
  it('toggles between timeline and report views', () => {
    render(<App />)
    // Default shows timeline
    expect(screen.getByText('今日时间线')).toBeInTheDocument()

    // Click report button
    const reportButton = screen.getByText('报告')
    fireEvent.click(reportButton)

    // Should show report view (empty state since no tasks)
    expect(screen.getByText('今天还没有记录')).toBeInTheDocument()

    // Click again to go back
    fireEvent.click(reportButton)
    expect(screen.getByText('今日时间线')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — view toggle not implemented

### Step 2: Modify `App.tsx`

Add `setView` and `view` from the store, implement toggle:

```tsx
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
```

Run: `npx vitest run src/App.test.tsx`
Expected: PASS

### Step 3: Commit

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire up timeline/report view toggle in App"
```

---

## Task 4: Final Verification

### Step 1: Run all tests

```bash
npx vitest run
```
Expected: ALL PASS (existing + new tests)

### Step 2: Build check

```bash
npx tsc --noEmit && npx vite build
```
Expected: Clean build, no TypeScript errors

### Step 3: Commit

```bash
git commit --allow-empty -m "feat: daily report view complete"
```

---

## Spec Coverage Checklist

| Spec Section | Task | Status |
|-------------|------|--------|
| Data layer: `generateTimeInsight` | Task 1 | ✅ |
| Metric cards 2x2 | Task 2 | ✅ |
| Completion rate progress bar | Task 2 | ✅ |
| Category breakdown bars | Task 2 | ✅ |
| Insight text | Task 2 | ✅ |
| Interruption source list | Task 2 | ✅ |
| Empty state | Task 2 | ✅ |
| View toggle in App.tsx | Task 3 | ✅ |
| Blank slots calculation | Task 2 (duplicated from Timeline) | ✅ |

## Placeholder Scan

- No TBD/TODO/"implement later" references
- No vague requirements — all calculations specified
- All test code complete and runnable
- All file paths exact
