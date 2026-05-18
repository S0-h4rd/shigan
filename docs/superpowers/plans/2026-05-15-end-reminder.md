# 结束提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement end-of-task reminders with T-5 minute pulse animation and T-0 modal offering end/extend/defer options.

**Architecture:** Store actions `extendTask` and `deferTask` handle the logic. `EndReminderModal` is a presentational modal component. `ActiveTaskBar` gets pulse styling via conditional CSS classes. `App.tsx` orchestrates modal visibility based on `remainingMs`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand 5, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/store/useAppStore.ts` | Add `extendTask` and `deferTask` actions |
| `src/store/useAppStore.test.ts` | Add tests for new actions |
| `src/components/EndReminderModal.tsx` | Modal UI for end/extend/defer |
| `src/components/EndReminderModal.test.tsx` | Modal render and interaction tests |
| `src/components/ActiveTaskBar.tsx` | Add pulse styling when T-5 minutes |
| `src/App.tsx` | Wire up modal visibility logic |
| `src/index.css` | Add `animate-pulse-reminder` keyframes |

---

## Task 1: Store Actions — `extendTask` and `deferTask`

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.test.ts`

### Step 1: Write the failing test

Add to existing `useAppStore.test.ts`:

```typescript
it('extends active task scheduledEnd by given minutes', () => {
  const { result } = renderHook(() => useAppStore())
  act(() => {
    result.current.startTask('Test', 30)
  })
  const task = result.current.schedule.tasks[0]
  const originalEnd = task.scheduledEnd!

  act(() => {
    result.current.extendTask(10)
  })

  const updated = result.current.schedule.tasks[0]
  expect(updated.scheduledEnd!.getTime()).toBe(originalEnd.getTime() + 10 * 60000)
  expect(updated.revisionCount).toBe(1)
})

it('defers active task and clears active state', () => {
  const { result } = renderHook(() => useAppStore())
  act(() => {
    result.current.startTask('Test', 30)
  })

  act(() => {
    result.current.deferTask()
  })

  const updated = result.current.schedule.tasks[0]
  expect(updated.status).toBe('deferred')
  expect(updated.scheduledStart).toBeUndefined()
  expect(updated.scheduledEnd).toBeUndefined()
  expect(updated.revisionCount).toBe(1)
  expect(result.current.activeTaskId).toBeNull()
  expect(result.current.timerStartAt).toBeNull()
})

it('extendTask does nothing when no active task', () => {
  const { result } = renderHook(() => useAppStore())
  act(() => {
    result.current.extendTask(10)
  })
  expect(result.current.schedule.tasks).toHaveLength(0)
})

it('deferTask does nothing when no active task', () => {
  const { result } = renderHook(() => useAppStore())
  act(() => {
    result.current.deferTask()
  })
  expect(result.current.schedule.tasks).toHaveLength(0)
})
```

Run: `npx vitest run src/store/useAppStore.test.ts`
Expected: FAIL — `extendTask` / `deferTask` not found

### Step 2: Implement actions

In `src/store/useAppStore.ts`, add to the store interface:

```typescript
extendTask: (additionalMinutes: number) => void
deferTask: () => void
```

Add to the store implementation:

```typescript
extendTask: (additionalMinutes) => {
  const { schedule, activeTaskId } = get()
  if (!activeTaskId) return

  const updatedTasks = schedule.tasks.map((t) => {
    if (t.id !== activeTaskId) return t
    return {
      ...t,
      scheduledEnd: t.scheduledEnd
        ? new Date(t.scheduledEnd.getTime() + additionalMinutes * 60000)
        : undefined,
      revisionCount: t.revisionCount + 1,
    }
  })

  set({ schedule: { ...schedule, tasks: updatedTasks } })
},

deferTask: () => {
  const { schedule, activeTaskId } = get()
  if (!activeTaskId) return

  const updatedTasks = schedule.tasks.map((t) => {
    if (t.id !== activeTaskId) return t
    return {
      ...t,
      status: 'deferred' as Task['status'],
      scheduledStart: undefined,
      scheduledEnd: undefined,
      revisionCount: t.revisionCount + 1,
    }
  })

  set({
    schedule: { ...schedule, tasks: updatedTasks },
    activeTaskId: null,
    timerStartAt: null,
  })
},
```

Run: `npx vitest run src/store/useAppStore.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add extendTask and deferTask store actions"
```

---

## Task 2: `EndReminderModal` Component

**Files:**
- Create: `src/components/EndReminderModal.tsx`
- Create: `src/components/EndReminderModal.test.tsx`

### Step 1: Write the failing test

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EndReminderModal from './EndReminderModal'
import type { Task } from '@/types'

const mockTask: Task = {
  id: '1',
  title: '写代码',
  plannedDurationMinutes: 30,
  status: 'active',
  actualStart: new Date(),
  scheduledEnd: new Date(Date.now() + 60000),
  priority: 'medium',
  revisionCount: 0,
}

describe('EndReminderModal', () => {
  it('does not render when closed', () => {
    render(<EndReminderModal task={mockTask} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('时间到了')).not.toBeInTheDocument()
  })

  it('renders task title when open', () => {
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('时间到了')).toBeInTheDocument()
    expect(screen.getByText(/写代码/)).toBeInTheDocument()
  })

  it('calls onClose when clicking X', () => {
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onEnd when clicking 结束', () => {
    const onEnd = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onEnd={onEnd} />)
    fireEvent.click(screen.getByText('结束'))
    expect(onEnd).toHaveBeenCalled()
  })

  it('calls onExtend when clicking 延长 10 分钟', () => {
    const onExtend = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onExtend={onExtend} />)
    fireEvent.click(screen.getByText('延长 10 分钟'))
    expect(onExtend).toHaveBeenCalled()
  })

  it('calls onDefer when clicking 延后到明天', () => {
    const onDefer = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onDefer={onDefer} />)
    fireEvent.click(screen.getByText('延后到明天'))
    expect(onDefer).toHaveBeenCalled()
  })
})
```

Run: `npx vitest run src/components/EndReminderModal.test.tsx`
Expected: FAIL — component not found

### Step 2: Implement `EndReminderModal`

```tsx
import { useCallback } from 'react'
import type { Task } from '@/types'

interface EndReminderModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onEnd?: () => void
  onExtend?: () => void
  onDefer?: () => void
}

export default function EndReminderModal({
  task,
  isOpen,
  onClose,
  onEnd,
  onExtend,
  onDefer,
}: EndReminderModalProps) {
  const handleEnd = useCallback(() => {
    onEnd?.()
    onClose()
  }, [onEnd, onClose])

  const handleExtend = useCallback(() => {
    onExtend?.()
    onClose()
  }, [onExtend, onClose])

  const handleDefer = useCallback(() => {
    onDefer?.()
    onClose()
  }, [onDefer, onClose])

  if (!isOpen || !task) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
        <div className="bg-bg-base rounded-xl shadow-2xl px-6 py-5 max-w-[320px] w-full mx-4 pointer-events-auto relative"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-reminder-title"
        >
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
          <h3 id="end-reminder-title" className="text-lg font-semibold text-text-primary">
            时间到了
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            任务 "{task.title}" 计划时间已结束
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleEnd}
              className="w-full px-4 py-2.5 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors"
            >
              结束
            </button>
            <button
              onClick={handleExtend}
              className="w-full px-4 py-2.5 bg-bg-subtle text-text-primary text-sm font-medium rounded-lg border border-border-light hover:bg-bg-muted transition-colors"
            >
              延长 10 分钟
            </button>
            <button
              onClick={handleDefer}
              className="w-full px-4 py-2.5 bg-bg-subtle text-text-primary text-sm font-medium rounded-lg border border-border-light hover:bg-bg-muted transition-colors"
            >
              延后到明天
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

Run: `npx vitest run src/components/EndReminderModal.test.tsx`
Expected: PASS

### Step 3: Commit

```bash
git add src/components/EndReminderModal.tsx src/components/EndReminderModal.test.tsx
git commit -m "feat: add EndReminderModal component"
```

---

## Task 3: ActiveTaskBar Pulse + App Integration

**Files:**
- Modify: `src/components/ActiveTaskBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

### Step 1: Add pulse animation to CSS

In `src/index.css`, add:

```css
@keyframes pulse-reminder {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(253, 224, 71, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(253, 224, 71, 0);
  }
}

.animate-pulse-reminder {
  animation: pulse-reminder 1.5s ease-in-out infinite;
}
```

### Step 2: Modify ActiveTaskBar

In `src/components/ActiveTaskBar.tsx`:

1. Import `useAppStore` actions `extendTask` and `deferTask`
2. Compute `isNearEnd = remainingMs > 0 && remainingMs <= 5 * 60 * 1000`
3. Add conditional class to the normal mode container:
   - When `isNearEnd`: add `animate-pulse-reminder border-overtime-border`
   - When `remainingMs <= 0`: add `border-overtime-border`
4. Change remaining time text color:
   - When `isNearEnd || remainingMs <= 0`: use `text-overtime-text`

### Step 3: Modify App.tsx

In `src/App.tsx`:

1. Import `EndReminderModal` from `./components/EndReminderModal`
2. Import `extendTask` and `deferTask` from store (or pass via props)
3. Add `showEndModal` state (or derive from `remainingMs <= 0`)
4. Use `useMemo` to compute `remainingMs` similar to ActiveTaskBar
5. Render `<EndReminderModal />` with callbacks:
   - `onEnd={endTask}`
   - `onExtend={() => extendTask(10)}`
   - `onDefer={deferTask}`
   - `isOpen={showEndModal}`
   - `onClose={() => setShowEndModal(false)}`

### Step 4: Test and commit

Run all tests:
```bash
npx vitest run
```

Build check:
```bash
npx tsc --noEmit && npx vite build
```

Commit:
```bash
git add src/components/ActiveTaskBar.tsx src/App.tsx src/index.css
git commit -m "feat: add end reminder pulse and modal integration"
```

---

## Task 4: Final Verification

### Step 1: Run all tests

```bash
npx vitest run
```
Expected: ALL PASS

### Step 2: Build check

```bash
npx tsc --noEmit && npx vite build
```
Expected: Clean build

### Step 3: Commit

```bash
git commit --allow-empty -m "feat: end reminder complete"
```

---

## Spec Coverage Checklist

| Spec Section | Task | Status |
|-------------|------|--------|
| T-5 分钟脉冲动画 | Task 3 | ✅ |
| T-0 弹窗 | Task 2 | ✅ |
| 结束按钮 | Task 2 | ✅ |
| 延长 10 分钟 | Task 1 + Task 2 | ✅ |
| 延后按钮 | Task 1 + Task 2 | ✅ |
| extendTask store action | Task 1 | ✅ |
| deferTask store action | Task 1 | ✅ |
| App.tsx 集成 | Task 3 | ✅ |
| 弹窗关闭（X） | Task 2 | ✅ |
| 边界情况处理 | All tasks | ✅ |
