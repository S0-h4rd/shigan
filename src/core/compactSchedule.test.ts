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
  it('skips a task and shifts subsequent tasks forward', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: 'Morning Meeting',
        status: 'scheduled',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: 'Coding',
        status: 'scheduled',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 90),
      }),
      makeTask({
        id: 'c',
        title: 'Lunch',
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

    expect(b.scheduledStart).toEqual(baseTime)
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 60))
    expect(b.revisionCount).toBe(1)

    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 60))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 90))
    expect(c.revisionCount).toBe(1)
  })

  it('skips the last task with no subsequent shift', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: 'Coding',
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

  it('does not affect non-scheduled tasks', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: 'Morning Meeting',
        status: 'scheduled',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: 'Early Meeting',
        status: 'completed',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 60),
      }),
      makeTask({
        id: 'c',
        title: 'Coding',
        status: 'scheduled',
        scheduledStart: addMinutes(baseTime, 60),
        scheduledEnd: addMinutes(baseTime, 120),
      }),
    ]

    const result = compactSchedule(tasks, 'a')
    expect(result).not.toBeNull()

    const b = result!.find((t) => t.id === 'b')!
    const c = result!.find((t) => t.id === 'c')!

    expect(b.scheduledStart).toEqual(addMinutes(baseTime, 30))
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 60))
    expect(b.revisionCount).toBe(0)

    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 30))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 90))
    expect(c.revisionCount).toBe(1)
  })

  it('returns null for missing task', () => {
    expect(compactSchedule([], 'x')).toBeNull()
  })
})
