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
    const insight = generateTimeInsight(schedule)
    expect(insight).toEqual({
      date: '2026-05-15',
      totalPlannedMinutes: 0,
      totalActualMinutes: 0,
      totalInterruptionMinutes: 0,
      completedTasks: 0,
      cancelledTasks: 0,
      deferredTasks: 0,
      categoryBreakdown: {},
      revisionCount: 0,
    })
  })

  it('sums planned minutes for non-cancelled tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', plannedDurationMinutes: 30, status: 'scheduled' }),
        makeTask({ id: 'b', title: 'Task B', plannedDurationMinutes: 45, status: 'cancelled' }),
        makeTask({ id: 'c', title: 'Task C', plannedDurationMinutes: 60, status: 'completed' }),
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.totalPlannedMinutes).toBe(90)
  })

  it('sums actual minutes for completed and active tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed', actualDurationMinutes: 25 }),
        makeTask({ id: 'b', title: 'Task B', status: 'active', actualDurationMinutes: 20 }),
        makeTask({ id: 'c', title: 'Task C', status: 'scheduled', actualDurationMinutes: 15 }),
        makeTask({ id: 'd', title: 'Task D', status: 'completed' }),
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.totalActualMinutes).toBe(45)
  })

  it('counts tasks by status', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed' }),
        makeTask({ id: 'b', title: 'Task B', status: 'completed' }),
        makeTask({ id: 'c', title: 'Task C', status: 'cancelled' }),
        makeTask({ id: 'd', title: 'Task D', status: 'deferred' }),
        makeTask({ id: 'e', title: 'Task E', status: 'deferred' }),
        makeTask({ id: 'f', title: 'Task F', status: 'deferred' }),
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.completedTasks).toBe(2)
    expect(insight.cancelledTasks).toBe(1)
    expect(insight.deferredTasks).toBe(3)
  })

  it('sums revision counts', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', revisionCount: 2 }),
        makeTask({ id: 'b', title: 'Task B', revisionCount: 3 }),
        makeTask({ id: 'c', title: 'Task C', revisionCount: 0 }),
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.revisionCount).toBe(5)
  })

  it('builds category breakdown from actualDurationMinutes', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', category: 'Work', actualDurationMinutes: 30, status: 'completed' }),
        makeTask({ id: 'b', title: 'Task B', category: 'Work', actualDurationMinutes: 20, status: 'completed' }),
        makeTask({ id: 'c', title: 'Task C', category: 'Personal', actualDurationMinutes: 15, status: 'active' }),
        makeTask({ id: 'd', title: 'Task D', actualDurationMinutes: 10, status: 'completed' }),
        makeTask({ id: 'e', title: 'Task E', category: 'Personal', status: 'completed' }),
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.categoryBreakdown).toEqual({
      Work: 50,
      Personal: 15,
      '未分类': 10,
    })
  })

  it('calculates interruption minutes from completed interruption tasks', () => {
    const schedule = makeSchedule({
      tasks: [
        makeTask({ id: 'a', title: 'Task A', status: 'completed', actualDurationMinutes: 30 }),
        makeTask({ id: 'b', title: 'Interruption 1', status: 'completed', actualDurationMinutes: 15 }),
        makeTask({ id: 'c', title: 'Interruption 2', status: 'active', actualDurationMinutes: 10 }),
      ],
      interruptions: [
        { id: 'i1', timestamp: new Date(), interruptedTaskId: 'a', newTaskId: 'b', description: 'Bug' },
        { id: 'i2', timestamp: new Date(), interruptedTaskId: 'a', newTaskId: 'c', description: 'Call' },
      ],
    })
    const insight = generateTimeInsight(schedule)
    expect(insight.totalInterruptionMinutes).toBe(15)
  })
})
