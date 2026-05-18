import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReportView from './ReportView'
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

describe('ReportView', () => {
  it('renders empty state when no tasks', () => {
    render(<ReportView schedule={makeSchedule()} />)
    expect(screen.getByText('今天还没有记录')).toBeInTheDocument()
    expect(screen.getByText('点击时间线开始你的第一个任务')).toBeInTheDocument()
  })

  it('renders date title', () => {
    render(<ReportView schedule={makeSchedule({ date: '2026-05-20', tasks: [makeTask({ id: 'a', title: 'Task A', status: 'completed' })] })} />)
    expect(screen.getByText('2026-05-20')).toBeInTheDocument()
  })

  it('renders metric cards', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed', actualDurationMinutes: 60, plannedDurationMinutes: 60 }),
      ],
    })
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('计划时长')).toBeInTheDocument()
    expect(screen.getByText('实际时长')).toBeInTheDocument()
    expect(screen.getByText('打断时长')).toBeInTheDocument()
    expect(screen.getByText('空白时长')).toBeInTheDocument()
  })

  it('renders completion rate bar', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed' }),
        makeTask({ id: 'b', title: 'Task B', status: 'cancelled' }),
        makeTask({ id: 'c', title: 'Task C', status: 'scheduled' }),
      ],
    })
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('1 项完成 · 1 项跳过 · 1 项进行中')).toBeInTheDocument()
  })

  it('renders insight text', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed', revisionCount: 1 }),
      ],
    })
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('1 项任务按时完成 · 计划被调整了 1 次')).toBeInTheDocument()
  })

  it('renders interruption sources when present', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Original', status: 'completed', actualDurationMinutes: 30 }),
        makeTask({ id: 'b', title: 'Bug Fix', status: 'completed', actualDurationMinutes: 15 }),
      ],
      interruptions: [
        { id: 'i1', timestamp: new Date(), interruptedTaskId: 'a', newTaskId: 'b', description: '紧急Bug' },
      ],
    })
    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('主要打断来源')).toBeInTheDocument()
    expect(screen.getByText('紧急Bug')).toBeInTheDocument()
    expect(screen.getByText('1次 · 15分钟')).toBeInTheDocument()
  })

  it('counts active task elapsed time in metrics', () => {
    const start = new Date('2026-05-15T10:00:00')
    const end = new Date('2026-05-15T10:30:00')
    const schedule = makeSchedule({
      tasks: [
        makeTask({
          id: 'a',
          title: 'Deep Work',
          status: 'completed',
          plannedDurationMinutes: 30,
          actualDurationMinutes: 30,
          actualStart: start,
          actualEnd: end,
          category: '深度工作',
        }),
        makeTask({
          id: 'b',
          title: 'Still Running',
          status: 'active',
          plannedDurationMinutes: 60,
          actualStart: new Date('2026-05-15T11:00:00'),
          category: '深度工作',
        }),
      ],
    })

    render(<ReportView schedule={schedule} />)
    expect(screen.getByText('计划时长')).toBeInTheDocument()
  })
})
