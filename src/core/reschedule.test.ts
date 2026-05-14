import { describe, expect, it } from 'vitest'
import { reschedule } from './reschedule'
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

const baseTime = new Date('2026-05-13T09:00:00')

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

describe('reschedule', () => {
  it('正常后推：被打断任务和后续未开始任务整体后推', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '晨会',
        status: 'paused',
        actualStart: baseTime,
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: '写代码',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 90),
      }),
      makeTask({
        id: 'c',
        title: '午饭',
        scheduledStart: addMinutes(baseTime, 90),
        scheduledEnd: addMinutes(baseTime, 120),
      }),
    ]

    const newTask = makeTask({
      id: 'x',
      title: '紧急 bug',
      actualDurationMinutes: 15,
      status: 'completed',
    })

    const result = reschedule(tasks, 'a', newTask)
    expect(result).not.toBeNull()

    const updated = result!
    const a = updated.find((t) => t.id === 'a')!
    const b = updated.find((t) => t.id === 'b')!
    const c = updated.find((t) => t.id === 'c')!

    // 已开始的任务只推结束时间
    expect(a.scheduledStart).toEqual(baseTime)
    expect(a.scheduledEnd).toEqual(addMinutes(baseTime, 45))
    expect(a.revisionCount).toBe(1)

    // 后续未开始任务整体后推 15 分钟
    expect(b.scheduledStart).toEqual(addMinutes(baseTime, 45))
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 105))
    expect(b.revisionCount).toBe(1)

    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 105))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 135))
    expect(c.revisionCount).toBe(1)
  })

  it('临时任务无实际时长：返回 null', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '写代码',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
    ]

    const newTask = makeTask({
      id: 'x',
      title: '临时',
      actualDurationMinutes: undefined,
      status: 'completed',
    })

    expect(reschedule(tasks, 'a', newTask)).toBeNull()
  })

  it('空列表：返回 null', () => {
    const newTask = makeTask({
      id: 'x',
      title: '临时',
      actualDurationMinutes: 10,
      status: 'completed',
    })

    expect(reschedule([], 'a', newTask)).toBeNull()
  })

  it('单任务：只推自己', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '写代码',
        status: 'paused',
        actualStart: baseTime,
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
    ]

    const newTask = makeTask({
      id: 'x',
      title: '临时',
      actualDurationMinutes: 20,
      status: 'completed',
    })

    const result = reschedule(tasks, 'a', newTask)
    expect(result).not.toBeNull()

    const a = result![0]
    expect(a.scheduledStart).toEqual(baseTime)
    expect(a.scheduledEnd).toEqual(addMinutes(baseTime, 50))
    expect(a.revisionCount).toBe(1)
  })

  it('原任务未开始被打断：整体后推', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '晨会',
        scheduledStart: baseTime,
        scheduledEnd: addMinutes(baseTime, 30),
      }),
      makeTask({
        id: 'b',
        title: '写代码',
        scheduledStart: addMinutes(baseTime, 30),
        scheduledEnd: addMinutes(baseTime, 90),
      }),
    ]

    const newTask = makeTask({
      id: 'x',
      title: '临时',
      actualDurationMinutes: 25,
      status: 'completed',
    })

    const result = reschedule(tasks, 'a', newTask)
    expect(result).not.toBeNull()

    const a = result!.find((t) => t.id === 'a')!
    const b = result!.find((t) => t.id === 'b')!

    // 未开始的任务整体后推
    expect(a.scheduledStart).toEqual(addMinutes(baseTime, 25))
    expect(a.scheduledEnd).toEqual(addMinutes(baseTime, 55))
    expect(a.revisionCount).toBe(1)

    expect(b.scheduledStart).toEqual(addMinutes(baseTime, 55))
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 115))
    expect(b.revisionCount).toBe(1)
  })

  it('已完成任务不受重排影响', () => {
    const tasks: Task[] = [
      makeTask({
        id: 'a',
        title: '晨会',
        status: 'paused',
        actualStart: baseTime,
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

    const newTask = makeTask({
      id: 'x',
      title: '临时',
      actualDurationMinutes: 10,
      status: 'completed',
    })

    const result = reschedule(tasks, 'a', newTask)
    expect(result).not.toBeNull()

    const b = result!.find((t) => t.id === 'b')!
    const c = result!.find((t) => t.id === 'c')!

    // 已完成的任务不受影响
    expect(b.scheduledStart).toEqual(addMinutes(baseTime, 30))
    expect(b.scheduledEnd).toEqual(addMinutes(baseTime, 60))
    expect(b.revisionCount).toBe(0)

    // 后续未开始任务后推
    expect(c.scheduledStart).toEqual(addMinutes(baseTime, 70))
    expect(c.scheduledEnd).toEqual(addMinutes(baseTime, 130))
    expect(c.revisionCount).toBe(1)
  })
})
