# 空状态组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add friendly empty states for first-time use, no plans, and all-blank scenarios.

**Architecture:** A reusable `EmptyState` component accepts a `variant` prop and renders context-appropriate messaging. Timeline uses it when no tasks exist. ReportView already has its own empty state and remains unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/EmptyState.tsx` | Reusable empty state component with three variants |
| `src/components/EmptyState.test.tsx` | Tests for each variant |
| `src/components/Timeline.tsx` | Show `EmptyState` when no tasks |

---

## Task 1: `EmptyState` Component

**Files:**
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/EmptyState.test.tsx`

### Step 1: Write the failing test

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders first-use variant', () => {
    render(<EmptyState variant="first-use" />)
    expect(screen.getByText('你的今天是什么样的？')).toBeInTheDocument()
    expect(screen.getByText('点击下方的「开始」按钮，记录你的第一个任务')).toBeInTheDocument()
  })

  it('renders no-plans variant', () => {
    render(<EmptyState variant="no-plans" />)
    expect(screen.getByText('今天没有计划')).toBeInTheDocument()
    expect(screen.getByText('随时点击开始记录')).toBeInTheDocument()
  })

  it('renders all-blank variant', () => {
    render(<EmptyState variant="all-blank" />)
    expect(screen.getByText('0% 已记录')).toBeInTheDocument()
    expect(screen.getByText('点击按钮，看见你的时间')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: FAIL

### Step 2: Implement `EmptyState`

```tsx
interface EmptyStateProps {
  variant: 'first-use' | 'no-plans' | 'all-blank'
}

const config = {
  'first-use': {
    icon: '○',
    title: '你的今天是什么样的？',
    subtitle: '点击下方的「开始」按钮，记录你的第一个任务',
  },
  'no-plans': {
    icon: '○',
    title: '今天没有计划',
    subtitle: '随时点击开始记录',
  },
  'all-blank': {
    icon: '○',
    title: '0% 已记录',
    subtitle: '点击按钮，看见你的时间',
  },
}

export default function EmptyState({ variant }: EmptyStateProps) {
  const { icon, title, subtitle } = config[variant]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl text-text-muted mb-4" aria-hidden="true">{icon}</span>
      <p className="text-text-secondary font-medium">{title}</p>
      <p className="text-sm text-text-muted mt-1">{subtitle}</p>
    </div>
  )
}
```

Run: `npx vitest run src/components/EmptyState.test.tsx`
Expected: PASS

### Step 3: Commit

```bash
git add src/components/EmptyState.tsx src/components/EmptyState.test.tsx
git commit -m "feat: add EmptyState component with three variants"
```

---

## Task 2: Integrate into Timeline

**Files:**
- Modify: `src/components/Timeline.tsx`

### Step 1: Import and use EmptyState

In `src/components/Timeline.tsx`:

1. Import `EmptyState` from `./EmptyState`
2. Before the timeline body, when `schedule.tasks.length === 0`, render `EmptyState`:

```tsx
{schedule.tasks.length === 0 ? (
  <EmptyState variant="first-use" />
) : (
  <!-- existing timeline body -->
)}
```

Actually, a better approach: always show the timeline body (with blank slots), but overlay the empty state when there are no tasks. Or simply show the empty state instead of the full timeline body when no tasks exist.

Let's show `EmptyState` when `schedule.tasks.length === 0`, replacing the timeline body but keeping the header:

```tsx
<div className="relative w-full max-w-[480px] mx-auto">
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
  {schedule.tasks.length === 0 ? (
    <EmptyState variant="first-use" />
  ) : (
    <div className="relative" style={{ height: `${totalHeight}px` }}>
      {/* existing timeline body */}
    </div>
  )}
</div>
```

### Step 2: Commit

```bash
git add src/components/Timeline.tsx
git commit -m "feat: show EmptyState in Timeline when no tasks"
```

---

## Task 3: Final Verification

### Step 1: Run all tests

```bash
npx vitest run
```

### Step 2: Build check

```bash
npx tsc --noEmit && npx vite build
```

### Step 3: Commit

```bash
git commit --allow-empty -m "feat: empty states complete"
```
