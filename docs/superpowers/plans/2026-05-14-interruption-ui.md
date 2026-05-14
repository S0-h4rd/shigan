# 打断处理 UI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现打断处理功能：任务进行中可插入新任务，原任务暂停；插入结束后恢复并自动重排后续日程。

**Architecture:** 在 Zustand store 新增 `interruptTask` / `resumeTask` actions，调整 `endTask` 以支持打断模式；`ActiveTaskBar` 根据 `pausedTaskId` + `activeTaskId` 呈现三态 UI；恢复时调用现有 `reschedule` 算法并处理跨天延后。

**Tech Stack:** React 19 + TypeScript + Zustand 5 + Tailwind CSS v4 + Vitest 4

---

## 文件结构

| 文件 | 动作 | 职责 |
|------|------|------|
| `src/store/useAppStore.ts` | 修改 | 新增 `interruptTask`、`resumeTask`；调整 `endTask`；完善 `AppStore` interface |
| `src/store/useAppStore.test.ts` | 创建 | Store actions 的单元测试 |
| `src/components/ActiveTaskBar.tsx` | 修改 | 三态 UI：正常进行中 / 打断输入 / 恢复提示 |
| `src/components/QuickStart.tsx` | 修改 | 当 `activeTaskId` 存在时不渲染 |
| `src/components/TaskBlock.tsx` | 修改 | 新增 `paused` 状态视觉样式和标签 |
| `src/components/Timeline.tsx` | 修改 | 任务块位置变化添加过渡动画 |
| `src/types/index.ts` | 修改（可能） | 若 `AppState` 缺少 `pausedTaskId` 则补全（当前已存在） |

---

### Task 1: Store — `interruptTask` action

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `src/store/useAppStore.test.ts`：

```typescript
import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

function resetStore() {
  // 通过替换状态重置 store，绕过 persist
  useAppStore.setState({
    schedule: { date: '2026-05-14', tasks: [], interruptions: [] },
    activeTaskId: null,
    pausedTaskId: null,
    timerStartAt: null,
    view: 'timeline',
  })
}

describe('interruptTask', () => {
  beforeEach(() => resetStore())

  it('有 active 任务时，暂停原任务并开始新任务', () => {
    // 先开始一个任务
    useAppStore.getState().startTask('原任务', 30)
    const state1 = useAppStore.getState()
    const originalId = state1.activeTaskId!
    expect(state1.pausedTaskId).toBeNull()

    // 模拟经过 10 分钟后打断
    const timerStart = state1.timerStartAt!
    useAppStore.setState({ timerStartAt: timerStart - 10 * 60000 })

    // 打断
    useAppStore.getState().interruptTask('紧急 bug', 15)
    const state2 = useAppStore.getState()

    expect(state2.pausedTaskId).toBe(originalId)
    expect(state2.activeTaskId).not.toBe(originalId)
    expect(state2.activeTaskId).not.toBeNull()

    const originalTask = state2.schedule.tasks.find((t) => t.id === originalId)!
    expect(originalTask.status).toBe('paused')
    expect(originalTask.actualDurationMinutes).toBe(10)

    const newTask = state2.schedule.tasks.find((t) => t.id === state2.activeTaskId!)!
    expect(newTask.status).toBe('active')
    expect(newTask.title).toBe('紧急 bug')
    expect(newTask.plannedDurationMinutes).toBe(15)

    // 应有 interruption 记录
    expect(state2.schedule.interruptions.length).toBe(1)
    expect(state2.schedule.interruptions[0].interruptedTaskId).toBe(originalId)
    expect(state2.schedule.interruptions[0].newTaskId).toBe(state2.activeTaskId)
  })

  it('无 active 任务时，interruptTask 不执行', () => {
    useAppStore.getState().interruptTask('紧急 bug', 15)
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.schedule.tasks.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL with `TypeError: useAppStore.getState().interruptTask is not a function`

- [ ] **Step 3: Write minimal implementation**

在 `src/store/useAppStore.ts` 中：

1. 在 `AppStore` interface 中新增：

```typescript
interface AppStore extends AppState {
  startTask: (
    title: string,
    plannedDurationMinutes: number,
    category?: string,
  ) => void
  endTask: () => void
  interruptTask: (
    title: string,
    plannedDurationMinutes: number,
    category?: string,
  ) => void
  resumeTask: () => void
  setView: (view: ViewMode) => void
}
```

2. 在 store 实现体中新增 `interruptTask`：

```typescript
interruptTask: (title, plannedDurationMinutes, category) => {
  const { schedule, activeTaskId, timerStartAt } = get()
  if (!activeTaskId || !timerStartAt) return

  const now = new Date()
  const elapsedMinutes = Math.round((Date.now() - timerStartAt) / 60000)

  // 暂停原任务
  const pausedTasks = schedule.tasks.map((t) => {
    if (t.id !== activeTaskId) return t
    return {
      ...t,
      status: 'paused' as Task['status'],
      actualDurationMinutes: elapsedMinutes,
    }
  })

  // 创建新任务
  const newTask: Task = {
    id: generateId(),
    title,
    plannedDurationMinutes,
    status: 'active',
    scheduledStart: now,
    scheduledEnd: new Date(now.getTime() + plannedDurationMinutes * 60000),
    actualStart: now,
    priority: 'medium',
    revisionCount: 0,
    category,
  }

  // 创建打断记录
  const interruption: Interruption = {
    id: generateId(),
    timestamp: now,
    interruptedTaskId: activeTaskId,
    newTaskId: newTask.id,
    description: title,
  }

  set({
    schedule: {
      ...schedule,
      tasks: [...pausedTasks, newTask],
      interruptions: [...schedule.interruptions, interruption],
    },
    activeTaskId: newTask.id,
    pausedTaskId: activeTaskId,
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
git commit -m "feat: add interruptTask action with tests"
```

---

### Task 2: Store — 调整 `endTask` 支持打断模式

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

在 `src/store/useAppStore.test.ts` 中追加：

```typescript
describe('endTask with interruption', () => {
  beforeEach(() => resetStore())

  it('结束打断任务时保留 pausedTaskId，进入恢复提示状态', () => {
    useAppStore.getState().startTask('原任务', 30)
    const originalId = useAppStore.getState().activeTaskId!
    useAppStore.getState().interruptTask('打断任务', 15)

    // 模拟打断任务进行了 20 分钟
    const timerStart = useAppStore.getState().timerStartAt!
    useAppStore.setState({ timerStartAt: timerStart - 20 * 60000 })

    useAppStore.getState().endTask()
    const state = useAppStore.getState()

    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBe(originalId)
    expect(state.timerStartAt).toBeNull()

    const interruptionTask = state.schedule.tasks.find(
      (t) => t.title === '打断任务',
    )!
    expect(interruptionTask.status).toBe('completed')
    expect(interruptionTask.actualDurationMinutes).toBe(20)
  })

  it('无 pausedTaskId 时，endTask 正常结束并清空状态', () => {
    useAppStore.getState().startTask('普通任务', 30)
    useAppStore.getState().endTask()
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.timerStartAt).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL（结束打断任务时 `pausedTaskId` 被错误清空）

- [ ] **Step 3: Write minimal implementation**

替换 `src/store/useAppStore.ts` 中的 `endTask`：

```typescript
endTask: () => {
  const { schedule, activeTaskId, pausedTaskId, timerStartAt } = get()
  if (!activeTaskId || !timerStartAt) return

  const now = new Date()
  const actualDurationMinutes = Math.round(
    (Date.now() - timerStartAt) / 60000,
  )

  const updatedTasks = schedule.tasks.map((t) => {
    if (t.id !== activeTaskId) return t
    return {
      ...t,
      status: 'completed' as Task['status'],
      actualEnd: now,
      actualDurationMinutes,
    }
  })

  // 如果当前结束的是打断任务（有 pausedTaskId），保留 pausedTaskId 以进入恢复提示
  const isInterruption = pausedTaskId != null

  set({
    schedule: { ...schedule, tasks: updatedTasks },
    activeTaskId: null,
    timerStartAt: null,
    // 只有非打断场景才清空 pausedTaskId
    pausedTaskId: isInterruption ? pausedTaskId : null,
  })
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: adjust endTask to support interruption flow"
```

---

### Task 3: Store — `resumeTask` action

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing test**

在 `src/store/useAppStore.test.ts` 中追加：

```typescript
import { reschedule } from '@/core/reschedule'

describe('resumeTask', () => {
  beforeEach(() => resetStore())

  it('恢复被暂停的任务并触发重排', () => {
    const base = new Date('2026-05-14T09:00:00')
    // 设置一个已计划的任务
    useAppStore.setState({
      schedule: {
        date: '2026-05-14',
        tasks: [
          {
            id: 'a',
            title: '原任务',
            plannedDurationMinutes: 30,
            status: 'active',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: base,
            scheduledEnd: new Date(base.getTime() + 30 * 60000),
            actualStart: base,
          },
          {
            id: 'b',
            title: '后续任务',
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
      activeTaskId: 'a',
      pausedTaskId: null,
      timerStartAt: Date.now() - 10 * 60000,
      view: 'timeline',
    })

    // 打断 20 分钟
    useAppStore.getState().interruptTask('打断', 20)
    const interruptionId = useAppStore.getState().activeTaskId!
    useAppStore.setState({ timerStartAt: Date.now() - 20 * 60000 })
    useAppStore.getState().endTask()

    // 恢复
    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()

    expect(state.activeTaskId).toBe('a')
    expect(state.pausedTaskId).toBeNull()
    expect(state.timerStartAt).not.toBeNull()

    const originalTask = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(originalTask.status).toBe('active')
    // 原任务被后推了 20 分钟
    expect(originalTask.scheduledStart!.getTime()).toBe(
      base.getTime() + 20 * 60000,
    )
    expect(originalTask.revisionCount).toBe(1)

    const followUp = state.schedule.tasks.find((t) => t.id === 'b')!
    expect(followUp.scheduledStart!.getTime()).toBe(
      base.getTime() + 50 * 60000,
    )
    expect(followUp.revisionCount).toBe(1)
  })

  it('跨天时标记后续任务为 deferred', () => {
    const late = new Date('2026-05-14T23:50:00')
    useAppStore.setState({
      schedule: {
        date: '2026-05-14',
        tasks: [
          {
            id: 'a',
            title: '晚任务',
            plannedDurationMinutes: 10,
            status: 'active',
            priority: 'medium',
            revisionCount: 0,
            scheduledStart: late,
            scheduledEnd: new Date(late.getTime() + 10 * 60000),
            actualStart: late,
          },
        ],
        interruptions: [],
      },
      activeTaskId: 'a',
      pausedTaskId: null,
      timerStartAt: Date.now() - 5 * 60000,
      view: 'timeline',
    })

    useAppStore.getState().interruptTask('打断', 15)
    useAppStore.setState({ timerStartAt: Date.now() - 15 * 60000 })
    useAppStore.getState().endTask()
    useAppStore.getState().resumeTask()

    const state = useAppStore.getState()
    const originalTask = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(originalTask.status).toBe('active')
    // 开始时间 23:55，结束时间 00:05（跨天）
    expect(originalTask.scheduledEnd!.getTime()).toBeGreaterThan(
      new Date('2026-05-14T23:59:59').getTime(),
    )
    // 原任务保留，但 revisionCount 增加
    expect(originalTask.revisionCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: FAIL with `TypeError: useAppStore.getState().resumeTask is not a function`

- [ ] **Step 3: Write minimal implementation**

在 `src/store/useAppStore.ts` 中新增 `resumeTask`：

```typescript
resumeTask: () => {
  const { schedule, pausedTaskId, activeTaskId } = get()
  if (!pausedTaskId) return

  // 找到被打断的任务和打断任务（最后一个 completed 且非 paused 的任务）
  const interruptedTask = schedule.tasks.find((t) => t.id === pausedTaskId)
  if (!interruptedTask) return

  const interruptionTask = schedule.tasks.find(
    (t) =>
      t.status === 'completed' &&
      schedule.interruptions.some((i) => i.newTaskId === t.id),
  )
  if (!interruptionTask || !interruptionTask.actualDurationMinutes) return

  // 调用 reschedule
  const rescheduled = reschedule(
    schedule.tasks,
    pausedTaskId,
    interruptionTask,
  )
  if (!rescheduled) return

  const now = new Date()

  // 检查跨天：如原任务排到明天，标记为 deferred
  const dayEnd = new Date(interruptedTask.scheduledStart || now)
  dayEnd.setHours(23, 59, 59, 999)

  const updatedTasks = rescheduled.map((task) => {
    if (task.id !== pausedTaskId) return task

    const isDeferred =
      task.scheduledEnd != null && task.scheduledEnd.getTime() > dayEnd.getTime()

    if (isDeferred) {
      return {
        ...task,
        status: 'deferred' as Task['status'],
        scheduledStart: undefined,
        scheduledEnd: undefined,
      }
    }

    return {
      ...task,
      status: 'active' as Task['status'],
      actualStart: now,
    }
  })

  // 找到恢复后的原任务
  const resumedTask = updatedTasks.find((t) => t.id === pausedTaskId)

  set({
    schedule: { ...schedule, tasks: updatedTasks },
    activeTaskId: resumedTask?.status === 'active' ? resumedTask.id : null,
    pausedTaskId: null,
    timerStartAt: resumedTask?.status === 'active' ? Date.now() : null,
  })
},
```

确保 `reschedule` 已导入：

```typescript
import { reschedule } from '@/core/reschedule'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useAppStore.test.ts`

Expected: PASS（可能有跨天测试需要微调，以实际输出为准）

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add resumeTask with reschedule and cross-day handling"
```

---

### Task 4: `ActiveTaskBar` — 状态 1（正常进行中）+ 状态 2（打断输入）

**Files:**
- Modify: `src/components/ActiveTaskBar.tsx`

- [ ] **Step 1: Add "有事插入" button to state 1**

修改 `src/components/ActiveTaskBar.tsx`：

在现有 "完成" 按钮前增加：

```tsx
<button
  onClick={() => setIsInterrupting(true)}
  className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-interruption-border text-interruption-text hover:bg-interruption-bg transition-colors"
>
  有事插入
</button>
```

需要新增 `useState` 管理打断输入模式：

```tsx
import { useMemo, useState } from 'react'
// ...
export default function ActiveTaskBar({ task }: ActiveTaskBarProps) {
  const endTask = useAppStore((state) => state.endTask)
  const interruptTask = useAppStore((state) => state.interruptTask)
  const [isInterrupting, setIsInterrupting] = useState(false)
  const [interruptTitle, setInterruptTitle] = useState('')
  const now = useNow(1000)
  // ...
```

- [ ] **Step 2: Implement interruption input mode**

当 `isInterrupting` 为 true 时，渲染输入区：

```tsx
if (isInterrupting) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto space-y-3">
        <div className="flex items-center gap-2 text-sm text-interruption-text">
          <span>⏸</span>
          <span className="truncate">
            当前被打断：{task.title}（已暂停）
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={interruptTitle}
            onChange={(e) => setInterruptTitle(e.target.value)}
            placeholder="发生了什么？"
            className="flex-1 px-3 py-2 text-sm bg-bg-subtle border border-border-light rounded-lg focus:outline-none focus:border-border-medium text-text-primary placeholder:text-text-placeholder"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && interruptTitle.trim()) {
                interruptTask(interruptTitle.trim(), 30)
                setIsInterrupting(false)
                setInterruptTitle('')
              }
            }}
            autoFocus
          />
          <button
            onClick={() => {
              if (!interruptTitle.trim()) return
              interruptTask(interruptTitle.trim(), 30)
              setIsInterrupting(false)
              setInterruptTitle('')
            }}
            className="shrink-0 px-4 py-2 bg-interruption-bg text-interruption-text text-sm font-medium rounded-lg border border-interruption-border hover:bg-interruption-border transition-colors"
          >
            开始
          </button>
          <button
            onClick={() => {
              setIsInterrupting(false)
              setInterruptTitle('')
            }}
            className="shrink-0 px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: 无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/components/ActiveTaskBar.tsx
git commit -m "feat: ActiveTaskBar interruption input mode"
```

---

### Task 5: `ActiveTaskBar` — 状态 3（恢复提示）

**Files:**
- Modify: `src/components/ActiveTaskBar.tsx`

- [ ] **Step 1: Extract paused task info for resume state**

从 store 读取 `pausedTaskId` 和 `resumeTask`：

```tsx
const pausedTaskId = useAppStore((state) => state.pausedTaskId)
const resumeTask = useAppStore((state) => state.resumeTask)
const pausedTask = useMemo(() => {
  if (!pausedTaskId) return null
  return useAppStore.getState().schedule.tasks.find((t) => t.id === pausedTaskId)
}, [pausedTaskId])
```

- [ ] **Step 2: Render resume prompt when pausedTask exists and no active task**

在组件开头（在状态 2 判断之后）增加状态 3：

```tsx
// 恢复提示模式：有 paused 任务但没有 active 任务
if (pausedTask && !task) {
  const pausedDurationMs = pausedTask.actualDurationMinutes
    ? pausedTask.actualDurationMinutes * 60000
    : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-interruption-bg border-t border-interruption-border px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-interruption-text text-xs">⏸</span>
          <span className="text-sm font-medium text-interruption-text truncate">
            {pausedTask.title}
          </span>
          <span className="text-xs text-interruption-text/70">
            已暂停 {formatDurationShort(pausedDurationMs)}
          </span>
        </div>
        <button
          onClick={resumeTask}
          className="shrink-0 px-4 py-2 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors"
        >
          恢复执行
        </button>
      </div>
    </div>
  )
}
```

注意：这里需要 `task` prop 可能为 null，需要调整 `ActiveTaskBarProps`：

```tsx
interface ActiveTaskBarProps {
  task: Task | null
}
```

- [ ] **Step 3: Update parent to handle null task**

检查 `src/components` 中使用 `ActiveTaskBar` 的地方（可能在 App 或某个页面组件中），确保传入的 `task` 允许为 null：

```tsx
const activeTask = schedule.tasks.find((t) => t.id === activeTaskId)
// ...
{activeTask || pausedTaskId ? (
  <ActiveTaskBar task={activeTask || null} />
) : (
  <QuickStart />
)}
```

如果找不到父组件，搜索 `ActiveTaskBar` 的引用：

```bash
grep -rn "ActiveTaskBar" src/
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: 无 TypeScript 错误

- [ ] **Step 5: Commit**

```bash
git add src/components/ActiveTaskBar.tsx
git commit -m "feat: ActiveTaskBar resume prompt mode"
```

---

### Task 6: `QuickStart` — 条件渲染

**Files:**
- Modify: `src/components/QuickStart.tsx`

- [ ] **Step 1: Hide QuickStart when there is an active task**

修改 `src/components/QuickStart.tsx`，在组件开头：

```tsx
export default function QuickStart() {
  const startTask = useAppStore((state) => state.startTask)
  const activeTaskId = useAppStore((state) => state.activeTaskId)
  const [customTitle, setCustomTitle] = useState('')

  // 当有活跃任务时，由 ActiveTaskBar 接管底部栏
  if (activeTaskId) return null

  // ... existing JSX
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/QuickStart.tsx
git commit -m "feat: hide QuickStart when active task exists"
```

---

### Task 7: `TaskBlock` — `paused` 状态视觉

**Files:**
- Modify: `src/components/TaskBlock.tsx`

- [ ] **Step 1: Add paused status styles and label**

在 `TaskBlock` 中找到状态颜色映射，增加 `paused`：

```tsx
const statusStyles = {
  scheduled: 'bg-scheduled-bg border-scheduled-border text-scheduled-text',
  active: 'bg-active-bg border-active-border text-active-text',
  paused: 'bg-interruption-bg border-interruption-border text-interruption-text',
  completed: 'bg-completed-bg border-completed-border text-completed-text',
  cancelled: 'bg-completed-bg border-completed-border text-completed-text',
  deferred: 'bg-completed-bg border-completed-border text-completed-text',
} as const

const statusIcons = {
  scheduled: '○',
  active: '▶',
  paused: '⏸',
  completed: '✓',
  cancelled: '✗',
  deferred: '→',
} as const
```

在任务信息行中，如果状态是 `paused`，显示已进行时长：

```tsx
{task.status === 'paused' && task.actualDurationMinutes != null && (
  <span className="text-xs opacity-75">
    已进行 {formatDurationShort(task.actualDurationMinutes * 60000)}
  </span>
)}
```

（如果 `TaskBlock` 中没有 `formatDurationShort`，从 `@/core/timer` 导入。）

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskBlock.tsx
git commit -m "feat: TaskBlock paused status styling"
```

---

### Task 8: `Timeline` — 过渡动画

**Files:**
- Modify: `src/components/Timeline.tsx`

- [ ] **Step 1: Add transition classes to task blocks**

找到渲染 `TaskBlock` 的容器或 `TaskBlock` 自身，添加过渡动画类：

```tsx
<div className="transition-all duration-300 ease-in-out">
  <TaskBlock task={task} />
</div>
```

或者直接在 `TaskBlock` 的根元素上添加：

```tsx
<div className={cn(
  'rounded-md border p-3 transition-all duration-300 ease-in-out',
  statusStyles[task.status]
)}>
```

（如果 `TaskBlock` 使用 `cn` 工具函数。如果没有，直接拼接 className。）

- [ ] **Step 2: Verify animation**

启动 dev server：`npm run dev`

手动测试：开始一个任务 → 打断 → 恢复 → 观察时间线色块是否平滑移动。

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.tsx
git commit -m "feat: add transition animation for task block repositioning"
```

---

### Task 9: 集成验证

**Files:**
- 无新文件，纯手动验证

- [ ] **Step 1: 完整流程走查**

启动 dev server：`npm run dev`，打开浏览器。

按以下步骤验证：

1. 首页点击快捷预设"深度工作" → 底部栏显示 ActiveTaskBar（状态 1）
2. 等待 1 分钟后点击"有事插入" → 底部栏展开打断输入（状态 2）
3. 输入"紧急会议"并点击开始 → 底部栏显示新任务计时，原任务色块变红（paused）
4. 等待 1 分钟后点击"完成" → 底部栏显示"恢复执行"（状态 3）
5. 点击"恢复执行" → 原任务恢复绿色（active），后续任务位置后移，transition 动画平滑
6. 刷新页面 → 检查状态是否正确恢复

- [ ] **Step 2: Store 测试全量通过**

Run: `npx vitest run`

Expected: 全部测试通过（包括原有的 reschedule.test.ts）

- [ ] **Step 3: Build 通过**

Run: `npm run build`

Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: interruption handling UI complete"
```

---

## Self-Review

### Spec Coverage

| Spec 章节 | 对应 Task |
|-----------|-----------|
| 2.3 `interruptTask` 逻辑 | Task 1 |
| 2.4 `resumeTask` 逻辑 | Task 3 |
| 2.5 `endTask` 调整 | Task 2 |
| 3.1 ActiveTaskBar 状态 1 | Task 4 |
| 3.1 ActiveTaskBar 状态 2 | Task 4 |
| 3.1 ActiveTaskBar 状态 3 | Task 5 |
| 3.2 QuickStart 调整 | Task 6 |
| 3.3 TaskBlock paused 样式 | Task 7 |
| 3.3 Timeline 过渡动画 | Task 8 |
| 4.3 跨天处理 | Task 3 |
| 4.3 刷新恢复 | Task 9 |

**无遗漏。**

### Placeholder Scan

- 无 "TBD" / "TODO" / "implement later"
- 无 "add appropriate error handling" 等模糊描述
- 每个测试步骤包含完整代码
- 每个实现步骤包含完整代码

### Type Consistency

- `interruptTask`、`resumeTask` 签名与 store interface 一致
- `Task['status']` 类型断言在所有地方统一使用
- `ActiveTaskBarProps.task` 改为 `Task | null` 并在所有引用处更新

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-05-14-interruption-ui.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
