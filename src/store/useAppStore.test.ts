import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore, defaultState, getSchedule } from './useAppStore'
import type { AppStore } from './useAppStore'
import type { DaySchedule, Task } from '@/types'

function resetStore() {
  useAppStore.setState(defaultState)
}

function syncedSetState(partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) {
  const state = useAppStore.getState()
  const next = typeof partial === 'function' ? partial(state) : partial
  const nextSchedules = next.schedules ?? state.schedules
  const nextDate = next.currentDate ?? state.currentDate
  useAppStore.setState({ ...next, schedule: getSchedule(nextSchedules, nextDate) } as Partial<AppStore>)
}

function makeTask(
  overrides: Partial<Task> & Pick<Task, 'id' | 'title' | 'status'>,
): Task {
  return {
    id: overrides.id,
    title: overrides.title,
    status: overrides.status,
    plannedDurationMinutes: overrides.plannedDurationMinutes ?? 30,
    priority: overrides.priority ?? 'medium',
    revisionCount: overrides.revisionCount ?? 0,
    scheduledStart: overrides.scheduledStart,
    scheduledEnd: overrides.scheduledEnd,
    originalScheduledStart: overrides.originalScheduledStart,
    originalScheduledEnd: overrides.originalScheduledEnd,
    actualStart: overrides.actualStart,
    actualEnd: overrides.actualEnd,
    actualDurationMinutes: overrides.actualDurationMinutes,
    category: overrides.category,
  }
}

function makeSchedule(date: string, tasks: Task[]): DaySchedule {
  return {
    date,
    tasks,
    interruptions: [],
  }
}

describe('interruptTask', () => {
  beforeEach(() => resetStore())

  it('pauses the active task and starts a new interruption task', () => {
    useAppStore.getState().startTask('Original Task', 30)
    const state1 = useAppStore.getState()
    const originalId = state1.runtime.activeTaskId!
    expect(state1.runtime.pausedTaskId).toBeNull()

    const timerStart = state1.runtime.startedAt!
    syncedSetState({
      runtime: { ...state1.runtime, startedAt: timerStart - 10 * 60000 },
    })

    useAppStore.getState().interruptTask('Urgent Bug', 15)
    const state2 = useAppStore.getState()

    expect(state2.runtime.pausedTaskId).toBe(originalId)
    expect(state2.runtime.activeTaskId).not.toBe(originalId)
    expect(state2.runtime.activeTaskId).not.toBeNull()

    const originalTask = state2.schedule.tasks.find(
      (t) => t.id === originalId,
    )!
    expect(originalTask.status).toBe('paused')
    expect(originalTask.actualDurationMinutes).toBe(10)

    const newTask = state2.schedule.tasks.find(
      (t) => t.id === state2.runtime.activeTaskId!,
    )!
    expect(newTask.status).toBe('active')
    expect(newTask.title).toBe('Urgent Bug')
    expect(newTask.plannedDurationMinutes).toBe(15)

    expect(state2.schedule.interruptions.length).toBe(1)
    expect(state2.schedule.interruptions[0].interruptedTaskId).toBe(
      originalId,
    )
    expect(state2.schedule.interruptions[0].newTaskId).toBe(
      state2.runtime.activeTaskId,
    )
  })

  it('does nothing when there is no active task', () => {
    useAppStore.getState().interruptTask('Urgent Bug', 15)
    const state = useAppStore.getState()
    expect(state.runtime.activeTaskId).toBeNull()
    expect(state.runtime.pausedTaskId).toBeNull()
    expect(state.schedule.tasks.length).toBe(0)
  })

  it('overwrites previous paused task when interrupting again', () => {
    useAppStore.getState().startTask('Task A', 30)
    useAppStore.getState().interruptTask('Interruption B', 15)
    const taskBId = useAppStore.getState().runtime.activeTaskId!

    // Try to interrupt again while B is active
    useAppStore.getState().interruptTask('Interruption C', 10)
    const state = useAppStore.getState()

    // B should be paused now, A is lost (flat model)
    expect(state.runtime.pausedTaskId).toBe(taskBId)
    expect(state.runtime.activeTaskId).not.toBe(taskBId)
    expect(
      state.schedule.tasks.find((t) => t.id === taskBId)!.status,
    ).toBe('paused')
  })
})

describe('endTask with interruption', () => {
  beforeEach(() => resetStore())

  it('keeps pausedTaskId when ending an interruption task', () => {
    useAppStore.getState().startTask('Original Task', 30)
    const originalId = useAppStore.getState().runtime.activeTaskId!
    useAppStore.getState().interruptTask('Interruption', 15)

    const timerStart = useAppStore.getState().runtime.startedAt!
    syncedSetState({
      runtime: {
        ...useAppStore.getState().runtime,
        startedAt: timerStart - 20 * 60000,
      },
    })

    useAppStore.getState().endTask()
    const state = useAppStore.getState()

    expect(state.runtime.activeTaskId).toBeNull()
    expect(state.runtime.pausedTaskId).toBe(originalId)
    expect(state.runtime.startedAt).toBeNull()

    const interruptionTask = state.schedule.tasks.find(
      (t) => t.title === 'Interruption',
    )!
    expect(interruptionTask.status).toBe('completed')
    expect(interruptionTask.actualDurationMinutes).toBe(20)
  })

  it('clears all state when ending a normal task', () => {
    useAppStore.getState().startTask('Normal Task', 30)
    useAppStore.getState().endTask()
    const state = useAppStore.getState()
    expect(state.runtime.activeTaskId).toBeNull()
    expect(state.runtime.pausedTaskId).toBeNull()
    expect(state.runtime.startedAt).toBeNull()
  })
})

describe('resumeTask', () => {
  beforeEach(() => resetStore())

  it('resumes the paused task and triggers reschedule', () => {
    const base = new Date('2026-05-14T09:00:00')
    const schedule = makeSchedule('2026-05-14', [
      makeTask({
        id: 'a',
        title: 'Original Task',
        plannedDurationMinutes: 30,
        status: 'active',
        scheduledStart: base,
        scheduledEnd: new Date(base.getTime() + 30 * 60000),
        actualStart: base,
      }),
      makeTask({
        id: 'b',
        title: 'Follow-up Task',
        plannedDurationMinutes: 30,
        status: 'scheduled',
        scheduledStart: new Date(base.getTime() + 30 * 60000),
        scheduledEnd: new Date(base.getTime() + 60 * 60000),
      }),
    ])
    syncedSetState({
      currentDate: '2026-05-14',
      schedules: { '2026-05-14': schedule },
      runtime: {
        activeTaskId: 'a',
        pausedTaskId: null,
        startedAt: Date.now() - 10 * 60000,
        pausedElapsedMinutes: null,
        date: '2026-05-14',
      },
      view: 'timeline',
    })

    useAppStore.getState().interruptTask('Interruption', 20)
    syncedSetState({
      runtime: {
        ...useAppStore.getState().runtime,
        startedAt: Date.now() - 20 * 60000,
      },
    })
    useAppStore.getState().endTask()

    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()

    expect(state.runtime.activeTaskId).toBe('a')
    expect(state.runtime.pausedTaskId).toBeNull()
    expect(state.runtime.startedAt).not.toBeNull()

    const originalTask = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(originalTask.status).toBe('active')
    expect(originalTask.scheduledStart!.getTime()).toBe(base.getTime())
    expect(originalTask.scheduledEnd!.getTime()).toBe(
      base.getTime() + 50 * 60000,
    )
    expect(originalTask.revisionCount).toBe(1)

    const followUp = state.schedule.tasks.find((t) => t.id === 'b')!
    expect(followUp.scheduledStart!.getTime()).toBe(
      base.getTime() + 50 * 60000,
    )
    expect(followUp.revisionCount).toBe(1)
  })

  it('marks task as deferred when reschedule pushes past midnight', () => {
    const late = new Date('2026-05-14T23:50:00')
    const schedule = makeSchedule('2026-05-14', [
      makeTask({
        id: 'a',
        title: 'Late Task',
        plannedDurationMinutes: 10,
        status: 'active',
        scheduledStart: late,
        scheduledEnd: new Date(late.getTime() + 10 * 60000),
        actualStart: late,
      }),
    ])
    syncedSetState({
      currentDate: '2026-05-14',
      schedules: { '2026-05-14': schedule },
      runtime: {
        activeTaskId: 'a',
        pausedTaskId: null,
        startedAt: Date.now() - 5 * 60000,
        pausedElapsedMinutes: null,
        date: '2026-05-14',
      },
      view: 'timeline',
    })

    useAppStore.getState().interruptTask('Interruption', 15)
    syncedSetState({
      runtime: {
        ...useAppStore.getState().runtime,
        startedAt: Date.now() - 15 * 60000,
      },
    })
    useAppStore.getState().endTask()
    useAppStore.getState().resumeTask()

    const state = useAppStore.getState()
    const originalTask = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(originalTask.status).toBe('deferred')
    expect(originalTask.scheduledStart).toBeUndefined()
    expect(originalTask.scheduledEnd).toBeUndefined()
  })

  it('does nothing when there is no paused task', () => {
    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()
    expect(state.runtime.activeTaskId).toBeNull()
    expect(state.runtime.pausedTaskId).toBeNull()
  })

  it('does nothing when reschedule returns null', () => {
    syncedSetState({
      currentDate: '2026-05-14',
      schedules: {
        '2026-05-14': {
          date: '2026-05-14',
          tasks: [
            {
              id: 'a',
              title: 'Task',
              plannedDurationMinutes: 30,
              status: 'paused',
              priority: 'medium',
              revisionCount: 0,
            },
            {
              id: 'x',
              title: 'Interruption',
              plannedDurationMinutes: 15,
              status: 'completed',
              priority: 'medium',
              revisionCount: 0,
            },
          ],
          interruptions: [
            {
              id: 'i1',
              timestamp: new Date(),
              interruptedTaskId: 'a',
              newTaskId: 'x',
              description: 'Interruption',
            },
          ],
        },
      },
      runtime: {
        activeTaskId: null,
        pausedTaskId: 'a',
        startedAt: null,
        pausedElapsedMinutes: null,
        date: '2026-05-14',
      },
      view: 'timeline',
    })

    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()
    expect(state.runtime.pausedTaskId).toBe('a')
  })
})

describe('addPlannedTask', () => {
  beforeEach(() => resetStore())

  it('appends a planned task to the end of the timeline', () => {
    const schedule = makeSchedule('2026-05-15', [
      makeTask({
        id: 'a',
        title: 'Existing',
        plannedDurationMinutes: 30,
        status: 'scheduled',
        scheduledStart: new Date('2026-05-15T09:00:00'),
        scheduledEnd: new Date('2026-05-15T09:30:00'),
      }),
    ])
    syncedSetState({
      currentDate: '2026-05-15',
      schedules: { '2026-05-15': schedule },
    })

    useAppStore.getState().addPlannedTask('New Task', 60)
    const state = useAppStore.getState()

    expect(state.schedule.tasks.length).toBe(2)
    const newTask = state.schedule.tasks[1]
    expect(newTask.title).toBe('New Task')
    expect(newTask.status).toBe('scheduled')
    expect(newTask.plannedDurationMinutes).toBe(60)
    expect(newTask.scheduledStart).toEqual(
      new Date('2026-05-15T09:30:00'),
    )
    expect(newTask.scheduledEnd).toEqual(
      new Date('2026-05-15T10:30:00'),
    )
  })

  it('uses current time when timeline is empty', () => {
    const before = Date.now()
    useAppStore.getState().addPlannedTask('First Task', 30)
    const after = Date.now()
    const state = useAppStore.getState()

    expect(state.schedule.tasks.length).toBe(1)
    const task = state.schedule.tasks[0]
    expect(task.status).toBe('scheduled')
    expect(task.scheduledStart).toBeDefined()
    const startTime = task.scheduledStart!.getTime()
    expect(startTime).toBeGreaterThanOrEqual(before)
    expect(startTime).toBeLessThanOrEqual(after)
  })

  it('creates a schedule when adding a task on a new date', () => {
    useAppStore.getState().setCurrentDate('2026-05-20')
    useAppStore.getState().addPlannedTask('New Day Task', 30)

    const state = useAppStore.getState()
    expect(state.schedules['2026-05-20']).toBeDefined()
    expect(state.schedule.tasks).toHaveLength(1)
    expect(state.schedule.tasks[0].title).toBe('New Day Task')
  })
})

describe('skipTask', () => {
  beforeEach(() => resetStore())

  it('marks task as cancelled and compacts subsequent tasks', () => {
    const base = new Date('2026-05-15T09:00:00')
    const schedule = makeSchedule('2026-05-15', [
      makeTask({
        id: 'a',
        title: 'Task A',
        plannedDurationMinutes: 30,
        status: 'scheduled',
        scheduledStart: base,
        scheduledEnd: new Date(base.getTime() + 30 * 60000),
      }),
      makeTask({
        id: 'b',
        title: 'Task B',
        plannedDurationMinutes: 30,
        status: 'scheduled',
        scheduledStart: new Date(base.getTime() + 30 * 60000),
        scheduledEnd: new Date(base.getTime() + 60 * 60000),
      }),
    ])
    syncedSetState({
      currentDate: '2026-05-15',
      schedules: { '2026-05-15': schedule },
    })

    useAppStore.getState().skipTask('a')
    const state = useAppStore.getState()

    const taskA = state.schedule.tasks.find((t) => t.id === 'a')!
    expect(taskA.status).toBe('cancelled')
    expect(taskA.scheduledStart).toBeUndefined()
    expect(taskA.scheduledEnd).toBeUndefined()

    const taskB = state.schedule.tasks.find((t) => t.id === 'b')!
    expect(taskB.scheduledStart).toEqual(base)
    expect(taskB.scheduledEnd).toEqual(
      new Date(base.getTime() + 30 * 60000),
    )
    expect(taskB.revisionCount).toBe(1)
  })
})

describe('extendTask', () => {
  beforeEach(() => resetStore())

  it('extends active task scheduledEnd by given minutes', () => {
    useAppStore.getState().startTask('Test', 30)
    const task = useAppStore.getState().schedule.tasks[0]
    const originalEnd = task.scheduledEnd!

    useAppStore.getState().extendTask(10)

    const updated = useAppStore.getState().schedule.tasks[0]
    expect(updated.scheduledEnd!.getTime()).toBe(
      originalEnd.getTime() + 10 * 60000,
    )
    expect(updated.revisionCount).toBe(1)
  })

  it('does nothing when no active task', () => {
    useAppStore.getState().extendTask(10)
    expect(useAppStore.getState().schedule.tasks).toHaveLength(0)
  })
})

describe('deferTask', () => {
  beforeEach(() => resetStore())

  it('defers active task and clears active state', () => {
    useAppStore.getState().startTask('Test', 30)

    useAppStore.getState().deferTask()

    const updated = useAppStore.getState().schedule.tasks[0]
    expect(updated.status).toBe('deferred')
    expect(updated.scheduledStart).toBeUndefined()
    expect(updated.scheduledEnd).toBeUndefined()
    expect(updated.revisionCount).toBe(1)
    expect(useAppStore.getState().runtime.activeTaskId).toBeNull()
    expect(useAppStore.getState().runtime.startedAt).toBeNull()
  })

  it('does nothing when no active task', () => {
    useAppStore.getState().deferTask()
    expect(useAppStore.getState().schedule.tasks).toHaveLength(0)
  })
})

describe('backfillTask', () => {
  beforeEach(() => resetStore())

  it('adds a completed task at the given time range', () => {
    const start = new Date('2026-05-15T10:00:00')
    const end = new Date('2026-05-15T10:30:00')
    useAppStore.getState().backfillTask('开会', 30, start, end)

    const tasks = useAppStore.getState().schedule.tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('开会')
    expect(tasks[0].status).toBe('completed')
    expect(tasks[0].plannedDurationMinutes).toBe(30)
    expect(tasks[0].actualDurationMinutes).toBe(30)
    expect(tasks[0].scheduledStart).toEqual(start)
    expect(tasks[0].scheduledEnd).toEqual(end)
    expect(tasks[0].actualStart).toEqual(start)
    expect(tasks[0].actualEnd).toEqual(end)
  })

  it('does nothing when title is empty', () => {
    const start = new Date('2026-05-15T10:00:00')
    const end = new Date('2026-05-15T10:30:00')
    useAppStore.getState().backfillTask('', 30, start, end)
    expect(useAppStore.getState().schedule.tasks).toHaveLength(0)
  })
})

describe('activateTask', () => {
  beforeEach(() => resetStore())

  it('activates a scheduled task and starts timer', () => {
    const base = new Date('2026-05-15T09:00:00')
    const schedule = makeSchedule('2026-05-15', [
      makeTask({
        id: 'a',
        title: 'Planned Task',
        plannedDurationMinutes: 30,
        status: 'scheduled',
        scheduledStart: base,
        scheduledEnd: new Date(base.getTime() + 30 * 60000),
      }),
    ])
    syncedSetState({
      currentDate: '2026-05-15',
      schedules: { '2026-05-15': schedule },
    })

    useAppStore.getState().activateTask('a')
    const state = useAppStore.getState()

    expect(state.runtime.activeTaskId).toBe('a')
    expect(state.runtime.startedAt).not.toBeNull()

    const task = state.schedule.tasks[0]
    expect(task.status).toBe('active')
    expect(task.actualStart).toBeDefined()
  })

  it('does nothing when there is already an active task', () => {
    useAppStore.getState().startTask('Active Task', 30)
    const currentDate = useAppStore.getState().currentDate
    const newSchedule = {
      date: currentDate,
      tasks: [
        ...useAppStore.getState().schedule.tasks,
        makeTask({
          id: 'b',
          title: 'Another',
          plannedDurationMinutes: 30,
          status: 'scheduled',
        }),
      ],
      interruptions: [],
    }
    syncedSetState({
      schedules: {
        ...useAppStore.getState().schedules,
        [currentDate]: newSchedule,
      },
    })

    useAppStore.getState().activateTask('b')
    const state = useAppStore.getState()
    expect(state.runtime.activeTaskId).not.toBe('b')
  })
})
