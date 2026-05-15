# 计划任务 Builder 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现计划任务功能：用户可以预先安排任务和预计时长，在时间线上以蓝色块展示；到计划时间可选择"开始执行"或"跳过"，跳过则自动前移后续计划任务。

**Architecture:** 在 Store 新增 `addPlannedTask` / `skipTask` / `activateTask` actions；新增 `compactSchedule` 算法（与 `reschedule` 对称，用于跳过任务后前移后续安排）；新增 `PlanTaskPanel` 底部面板用于添加计划任务；在 `TaskBlock` 中增加到时间提醒的"开始执行/跳过"按钮。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4 + Zustand 5 + Vitest 4

---

## 文件结构

| 文件 | 动作 | 职责 |
|------|------|------|
| `src/core/compactSchedule.ts` | 创建 | 跳过任务后前移后续 scheduled 任务的纯函数算法 |
| `src/core/compactSchedule.test.ts` | 创建 | compactSchedule 单元测试 |
| `src/store/useAppStore.ts` | 修改 | 新增 `addPlannedTask`、`skipTask`、`activateTask` |
| `src/store/useAppStore.test.ts` | 修改 | 追加新 actions 的单元测试 |
| `src/components/PlanTaskPanel.tsx` | 创建 | 底部面板：任务名输入 + 时长快捷选项 |
| `src/components/Timeline.tsx` | 修改 | 顶部添加"添加计划"按钮，条件渲染 PlanTaskPanel |
| `src/components/TaskBlock.tsx` | 修改 | 到时间提醒：显示"开始执行"和"跳过"按钮 |

---

### Task 1: `compactSchedule` 算法

**Files:**
- Create: `src/core/compactSchedule.ts`
- Test: `src/core/compactSchedule.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `src/core/compactSchedule.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { compactSchedule } from './compactSchedule'
import type { Task } from '@/types'

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    plannedDurationMinutes: 30,
    status: 'scheduled',
    priority: 'medium',
    revisionCount: 0,
    ...overrides,
  }
}

const baseTime = new Date('2026-05-15T09:00:00')

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

describe('compactSchedule', () => {
  it('跳过单个任务后，后续任务前移', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '晨会',
        status: 'scheduled',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: '写代码',
        status: 'scheduled',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 90),
      }),
      makeTask({
        id: 'c',
        title: '午饭',
        status: 'scheduled',
        scheduledStart: addMinutes(baseTime, 90),
        scheduledEnd: addMinutes(baseTime, 120),
      }),
    ]

    const result = compactSchedule(tasks, 'a')
    expect(result).not.toBeNull()

    const updated = result!
    const a = updated.find((t) => t.id === 'a')!
    const b = updated.find((t) => t.id === 'b')!
    const c = updated.find((t) => t.id === 'c')!

    expect(a.status).toBe('cancelled')
    expect(a.scheduledStart).toBeUndefined()
    expect(a.scheduledEnd).toBeUndefined()
    expect(a.revisionCount).toBe(1)

    // b 前移 30 分钟
    expect(b.scheduledStart).toEqual(baseTime)
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 60))
    expect(b.revisionCount).toBe(1)

    // c 前移 30 分钟
    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 60))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 90))
    expect(c.revisionCount).toBe(1)
  })

  it('跳过最后一个任务，无需前移', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '写代码',
        status: 'scheduled',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
    ]

    const result = compactSchedule(tasks, 'a')
    expect(result).not.toBeNull()

    const a = result![0]
    expect(a.status).toBe('cancelled')
    expect(a.scheduledStart).toBeUndefined()
    expect(a.scheduledEnd).toBeUndefined()
  })

  it('非 scheduled 任务不受影响', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '晨会',
        status: 'scheduled',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: '早会',
        status: 'completed',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 60),
      }),
      makeTask({
        id: 'c',
        title: '写代码',
        status: 'scheduled',
        scheduledStart: addMinutes(baseTime, 60),
        scheduledEnd: addMinutes(baseTime, 120),
      }),
    ]

    const result = compactSchedule(tasks, 'a')
    expect(result).not.toBeNull()

    const b = result!.find((t) => t.id === 'b')!
    const c = result!.find((t) => t.id === 'c')!

    // 已完成的任务不受影响
    expect(b.scheduledStart).toEqual(addMinutes(baseTime, 30))
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 60))
    expect(b.revisionCount).toBe(0)

    // c 前移 30 分钟
    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 30))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 90))
    expect(c.revisionCount).toBe(1)
  })

  it('找不到任务返回 null', () => {
    expect(compactSchedule([], 'x')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/compactSchedule.test.ts`

Expected: FAIL with `Error: Cannot find module './compactSchedule'`

- [ ] **Step 3: Write minimal implementation**

创建 `src/core/compactSchedule.ts`：

```typescript
import type { Task } from '@/types'

export function compactSchedule(
  tasks: Task[],
  skippedTaskId: string,
): Task[] | null {
  const skippedTask = tasks.find((t) => t.id === skippedTaskId)
  if (!skippedTask || !skippedTask.scheduledStart || !skippedTask.scheduledEnd) {
    return null
  }

  const gapMs =
    skippedTask.scheduledEnd.getTime() - skippedTask.scheduledStart.getTime()
  const anchorTime = skippedTask.scheduledStart.getTime()

  return tasks.map((task) => {
    if (task.id === skippedTaskId) {
      return {
        ...task,
        status: 'cancelled' as Task['status'],
        scheduledStart: undefined,
        scheduledEnd: undefined,
        revisionCount: task.revisionCount + 1,
      }
    }

    if (
      task.status === 'scheduled' &&
      task.scheduledStart &&
      task.scheduledStart.getTime() >= anchorTime
    ) {
      return {
        ...task,
        scheduledStart: new Date(task.scheduledStart.getTime() - gapMs),
        scheduledEnd: task.scheduledEnd
          ? new Date(task.scheduledEnd.getTime() - gapMs)
          : undefined,
        revisionCount: task.revisionCount + 1,
      }
    }

    return task
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/compactSchedule.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/compactSchedule.ts src/core/compactSchedule.test.ts
git commit -m "feat: add compactSchedule algorithm with tests"
```

---

### Task 2: Store — `addPlannedTask` action

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

追加到 `src/store/useAppStore.test.ts`：

```typescript
describe('addPlannedTask', () => {
  beforeEach(() => resetStore())

  it('adds a planned task to the end of the timeline', () => {
    // Pre-populate with an existing task
    useAppStore.setState({
      schedule: {
        date: '2026-05-15',
        tasks: [
          {
            id: 'a',
            title: 'Existing',
            plannedDurationMinutes: 30,
            status: 'scheduled',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: new Date('2026-05-15T09:00:00'),
            scheduledEnd: new Date('2026-05-15T09:30:00'),
          },
        ],
        interruptions: [],
      },
    })

    useAppStore.getState().addPlannedTask('New Task', 60)
    const state = useAppStore.getState()

    expect(state.schedule.tasks.length).toBe(2)
    const newTask = state.schedule.tasks[1]
    expect(newTask.title).toBe('New Task')
    expect(newTask.status).toBe('scheduled')
    expect(newTask.plannedDurationMinutes).toBe(60)
    expect(newTask.scheduledStart).toEqual(new Date('2026-05-15T09:30:00'))
    expect(newTask.scheduledEnd).toEqual(new Date('2026-05-15T10:30:00'))
  })

  it('uses rounded current time when timeline is empty', () => {
    const now = new Date()
    useAppStore.getState().addPlannedTask('First Task', 30)
    const state = useAppStore.getState()

    expect(state.schedule.tasks.length).toBe(1)
    const task = state.schedule.tasks[0]
    expect(task.status).toBe('scheduled')
    expect(task.scheduledStart).toBeDefined()
    // scheduledStart should be rounded to next 30-min boundary
    const startMin = task.scheduledStart!.getMinutes()
    expect(startMin === 0 || startMin === 30).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL with `TypeError: useAppStore.getState().addPlannedTask is not a function`

- [ ] **Step 3: Write minimal implementation**

在 `src/store/useAppStore.ts` 中：

1. 在 `AppStore` interface 中新增：

```typescript
addPlannedTask: (
  title: string,
  plannedDurationMinutes: number,
) => void
skipTask: (taskId: string) => void
activateTask: (taskId: string) => void
```

2. 在 store 实现体中新增 `addPlannedTask`：

```typescript
addPlannedTask: (title, plannedDurationMinutes) => {
  const { schedule } = get()
  const now = new Date()

  // Find last task with scheduledEnd to append after
  let defaultStart = now
  const lastTask = [...schedule.tasks]
    .filter((t) => t.scheduledEnd)
    .sort(
      (a, b) =>
        (b.scheduledEnd?.getTime() ?? 0) -
        (a.scheduledEnd?.getTime() ?? 0),
    )[0]

  if (lastTask?.scheduledEnd) {
    defaultStart = lastTask.scheduledEnd
  } else {
    // Round up to next 30-minute boundary
    const ms = defaultStart.getTime()
    const thirtyMin = 30 * 60000
    defaultStart = new Date(Math.ceil(ms / thirtyMin) * thirtyMin)
  }

  const newTask: Task = {
    id: generateId(),
    title,
    plannedDurationMinutes,
    status: 'scheduled',
    scheduledStart: defaultStart,
    scheduledEnd: new Date(
      defaultStart.getTime() + plannedDurationMinutes * 60000,
    ),
    priority: 'medium',
    revisionCount: 0,
  }

  set({
    schedule: {
      ...schedule,
      tasks: [...schedule.tasks, newTask],
    },
  })
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add addPlannedTask action with tests"
```

---

### Task 3: Store — `skipTask` action

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

追加到 `src/store/useAppStore.test.ts`：

```typescript
describe('skipTask', () => {
  beforeEach(() => resetStore())

  it('marks task as cancelled and compacts subsequent tasks', () => {
    const base = new Date('2026-05-15T09:00:00')
    useAppStore.setState({
      schedule: {
        date: '2026-05-15',
        tasks: [
          {
            id: 'a',
            title: 'Task A',
            plannedDurationMinutes: 30,
            status: 'scheduled',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: base,
            scheduledEnd: new Date(base.getTime() + 30 * 60000),
          },
          {
            id: 'b',
            title: 'Task B',
            plannedDurationMinutes: 30,
            status: 'scheduled',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: new Date(base.getTime() + 30 * 60000),
            scheduledEnd: new Date(base.getTime() + 60 * 60000),
          },
        ],
        interruptions: [],
      },
    })

    useAppStore.getState().skipTask('a')
    const state = useAppStore.getState()

    const taskA = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(taskA.status).toBe('cancelled')
    expect(taskA.scheduledStart).toBeUndefined()
    expect(taskA.scheduledEnd).toBeUndefined()

    const taskB = state.schedule.tasks.find((t) => t.id === 'b')!
    expect(taskB.scheduledStart).toEqual(base)
    expect(taskB.scheduledEnd).toEqual(new Date(base.getTime() + 30 * 60000))
    expect(taskB.revisionCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL with `TypeError: useAppStore.getState().skipTask is not a function`

- [ ] **Step 3: Write minimal implementation**

在 `src/store/useAppStore.ts` 中新增 `skipTask`，确保导入 `compactSchedule`：

```typescript
import { compactSchedule } from '@/core/compactSchedule'
```

```typescript
skipTask: (taskId) => {
  const { schedule } = get()
  const task = schedule.tasks.find((t) => t.id === taskId)
  if (!task || task.status !== 'scheduled') return

  const compacted = compactSchedule(schedule.tasks, taskId)
  if (!compacted) return

  set({
    schedule: { ...schedule, tasks: compacted },
  })
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add skipTask action with tests"
```

---

### Task 4: Store — `activateTask` action

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

追加到 `src/store/useAppStore.test.ts`：

```typescript
describe('activateTask', () => {
  beforeEach(() => resetStore())

  it('activates a scheduled task and starts timer', () => {
    const base = new Date('2026-05-15T09:00:00')
    useAppStore.setState({
      schedule: {
        date: '2026-05-15',
        tasks: [
          {
            id: 'a',
            title: 'Planned Task',
            plannedDurationMinutes: 30,
            status: 'scheduled',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: base,
            scheduledEnd: new Date(base.getTime() + 30 * 60000),
          },
        ],
        interruptions: [],
      },
    })

    useAppStore.getState().activateTask('a')
    const state = useAppStore.getState()

    expect(state.activeTaskId).toBe('a')
    expect(state.timerStartAt).not.toBeNull()

    const task = state.schedule.tasks[0]
    expect(task.status).toBe('active')
    expect(task.actualStart).toBeDefined()
  })

  it('does nothing when there is already an active task', () => {
    useAppStore.getState().startTask('Active Task', 30)
    useAppStore.setState({
      schedule: {
        date: '2026-05-15',
        tasks: [
          ...useAppStore.getState().schedule.tasks,
          {
            id: 'b',
            title: 'Another',
            plannedDurationMinutes: 30,
            status: 'scheduled',
            priority: 'medium',
            revisionCount: 0,
          },
        ],
        interruptions: [],
      },
    })

    useAppStore.getState().activateTask('b')
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBe(useAppStore.getState().schedule.tasks[0].id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL with `TypeError: useAppStore.getState().activateTask is not a function`

- [ ] **Step 3: Write minimal implementation**

在 `src/store/useAppStore.ts` 中新增：

```typescript
activateTask: (taskId) => {
  const { schedule, activeTaskId } = get()
  if (activeTaskId) return

  const now = new Date()
  const updatedTasks = schedule.tasks.map((t) => {
    if (t.id !== taskId) return t
    return {
      ...t,
      status: 'active' as Task['status'],
      actualStart: now,
    }
  })

  set({
    schedule: { ...schedule, tasks: updatedTasks },
    activeTaskId: taskId,
    timerStartAt: Date.now(),
  })
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add activateTask action with tests"
```

---

### Task 5: `PlanTaskPanel` 组件

**Files:**
- Create: `src/components/PlanTaskPanel.tsx`

- [ ] **Step 1: Implement the component**

创建 `src/components/PlanTaskPanel.tsx`：

```typescript
import { useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

const DURATIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '60分钟', value: 60 },
  { label: '90分钟', value: 90 },
]

interface PlanTaskPanelProps {
  onClose: () => void
}

export default function PlanTaskPanel({ onClose }: PlanTaskPanelProps) {
  const addPlannedTask = useAppStore((state) => state.addPlannedTask)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    addPlannedTask(trimmed, duration)
    setTitle('')
    onClose()
  }, [title, duration, addPlannedTask, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="计划做什么？"
            aria-label="计划做什么？"
            className="flex-1 px-3 py-2 text-sm bg-bg-subtle border border-border-light rounded-lg focus:outline-none focus:border-border-medium text-text-primary placeholder:text-text-placeholder"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            aria-label="添加计划任务"
            className="shrink-0 px-4 py-2 bg-scheduled-bg text-scheduled-text text-sm font-medium rounded-lg border border-scheduled-border hover:bg-scheduled-border transition-colors"
          >
            添加
          </button>
          <button
            onClick={onClose}
            aria-label="取消"
            className="shrink-0 px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            取消
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              aria-pressed={duration === d.value}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                duration === d.value
                  ? 'bg-scheduled-bg text-scheduled-text border-scheduled-border'
                  : 'bg-bg-subtle text-text-secondary border-border-light hover:bg-bg-muted'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanTaskPanel.tsx
git commit -m "feat: add PlanTaskPanel component"
```

---

### Task 6: `Timeline` — 集成"添加计划"按钮

**Files:**
- Modify: `src/components/Timeline.tsx`
- Modify: `src/App.tsx`（条件渲染 PlanTaskPanel）

- [ ] **Step 1: Add "添加计划" button to Timeline header**

在 `src/components/Timeline.tsx` 中，在 `return` 的开头添加一个 header 区域：

```tsx
<div className="relative w-full max-w-[480px] mx-auto">
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-2">
    <span className="text-sm font-medium text-text-secondary">
      今日时间线
    </span>
    <button
      onClick={onAddPlan}
      className="px-3 py-1.5 text-xs font-medium text-scheduled-text border border-scheduled-border rounded-full hover:bg-scheduled-bg transition-colors"
    >
      + 添加计划
    </button>
  </div>

  {/* 时间线主体 */}
  <div className="relative" style={{ height: `${totalHeight}px` }}>
```

需要给 `TimelineProps` 增加 `onAddPlan`：

```typescript
interface TimelineProps {
  schedule: DaySchedule
  onAddPlan: () => void
}
```

- [ ] **Step 2: Wire up PlanTaskPanel in App.tsx**

修改 `src/App.tsx`：

1. 导入 `PlanTaskPanel`：
```typescript
import { useState } from 'react'
import PlanTaskPanel from './components/PlanTaskPanel'
```

2. 添加状态：
```typescript
const [showPlanPanel, setShowPlanPanel] = useState(false)
```

3. 更新 Timeline 和条件渲染：
```tsx
<main className="py-4">
  <Timeline schedule={displaySchedule} onAddPlan={() => setShowPlanPanel(true)} />
</main>
{activeTask || pausedTaskId ? (
  <ActiveTaskBar task={activeTask || null} />
) : showPlanPanel ? (
  <PlanTaskPanel onClose={() => setShowPlanPanel(false)} />
) : (
  <QuickStart />
)}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.tsx src/App.tsx
git commit -m "feat: integrate add plan button and PlanTaskPanel"
```

---

### Task 7: `TaskBlock` — 到时间提醒按钮

**Files:**
- Modify: `src/components/TaskBlock.tsx`

- [ ] **Step 1: Add "开始执行 / 跳过" buttons for due scheduled tasks**

在 `src/components/TaskBlock.tsx` 中：

1. 导入 store actions：
```typescript
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'
```

2. 在组件内部读取 actions：
```typescript
export default function TaskBlock({ task, style, isInterrupt }: TaskBlockProps) {
  const activateTask = useAppStore((state) => state.activateTask)
  const skipTask = useAppStore((state) => state.skipTask)
  const now = useNow(1000)
  // ...
```

3. 计算是否到时间：
```typescript
const isDue =
  task.status === 'scheduled' &&
  task.scheduledStart &&
  now >= task.scheduledStart.getTime()
```

4. 在渲染中添加按钮区域（在标签和时长信息之间或下方）：

在 `return` 的 JSX 中，在 `(timeRange || duration)` 的 div 之后添加：

```tsx
{isDue && (
  <div className="mt-2 flex items-center gap-2">
    <button
      onClick={() => activateTask(task.id)}
      aria-label="开始执行任务"
      className="px-2.5 py-1 text-xs font-medium bg-active-bg text-active-text border border-active-border rounded-md hover:bg-active-border transition-colors"
    >
      开始执行
    </button>
    <button
      onClick={() => skipTask(task.id)}
      aria-label="跳过任务"
      className="px-2.5 py-1 text-xs font-medium bg-bg-subtle text-text-muted border border-border-light rounded-md hover:bg-bg-muted transition-colors"
    >
      跳过
    </button>
  </div>
)}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskBlock.tsx
git commit -m "feat: add start/skip buttons for due scheduled tasks"
```

---

### Task 8: 集成验证

**Files:**
- 无新文件

- [ ] **Step 1: 全量测试**

Run: `npx vitest run`

Expected: 所有测试通过（包括 reschedule.test.ts、compactSchedule.test.ts、useAppStore.test.ts）。

- [ ] **Step 2: Build 检查**

Run: `npm run build`

Expected: 无 TypeScript 错误。

- [ ] **Step 3: 手动验证清单**

1. 打开应用，点击"+ 添加计划" → 底部面板滑出
2. 输入任务名，选择 30 分钟，点击"添加" → 时间线出现蓝色 scheduled 块
3. 等待（或调整系统时间）到计划开始时间 → 蓝色块内出现"开始执行"和"跳过"按钮
4. 点击"开始执行" → 蓝色变绿色，底部出现 ActiveTaskBar，计时启动
5. 再次添加计划任务，到时间后点击"跳过" → 灰色显示，后续任务前移
6. 验证 `QuickStart` 在 `activeTaskId` 存在时隐藏

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: planned task builder complete"
```

---

## Self-Review

### Spec Coverage

| Spec 章节 | 对应 Task |
|-----------|-----------|
| 2.2 `addPlannedTask` | Task 2 |
| 2.3 `skipTask` | Task 3 |
| 2.4 `activateTask` | Task 4 |
| 3 `compactSchedule` | Task 1 |
| 4.1 入口按钮 | Task 6 |
| 4.2 `PlanTaskPanel` | Task 5 |
| 4.3 scheduled 渲染 | 已有 TaskBlock 支持 |
| 4.4 到时间提醒 | Task 7 |

**无遗漏。**

### Placeholder Scan

- 无 "TBD" / "TODO" / "implement later"
- 每个步骤包含完整代码和命令
- 无 "Similar to Task N"

### Type Consistency

- `addPlannedTask`、`skipTask`、`activateTask` 签名与 store interface 一致
- `compactSchedule` 输入输出类型一致
- `PlanTaskPanelProps` 定义清晰

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-planned-task-builder.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
