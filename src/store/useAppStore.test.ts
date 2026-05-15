import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore, defaultState } from './useAppStore'

function resetStore() {
  useAppStore.setState(defaultState)
}

describe('interruptTask', () => {
  beforeEach(() => resetStore())

  it('pauses the active task and starts a new interruption task', () => {
    useAppStore.getState().startTask('Original Task', 30)
    const state1 = useAppStore.getState()
    const originalId = state1.activeTaskId!
    expect(state1.pausedTaskId).toBeNull()

    const timerStart = state1.timerStartAt!
    useAppStore.setState({ timerStartAt: timerStart - 10 * 60000 })

    useAppStore.getState().interruptTask('Urgent Bug', 15)
    const state2 = useAppStore.getState()

    expect(state2.pausedTaskId).toBe(originalId)
    expect(state2.activeTaskId).not.toBe(originalId)
    expect(state2.activeTaskId).not.toBeNull()

    const originalTask = state2.schedule.tasks.find((t) => t.id === originalId)!
    expect(originalTask.status).toBe('paused')
    expect(originalTask.actualDurationMinutes).toBe(10)

    const newTask = state2.schedule.tasks.find((t) => t.id === state2.activeTaskId!)!
    expect(newTask.status).toBe('active')
    expect(newTask.title).toBe('Urgent Bug')
    expect(newTask.plannedDurationMinutes).toBe(15)

    expect(state2.schedule.interruptions.length).toBe(1)
    expect(state2.schedule.interruptions[0].interruptedTaskId).toBe(originalId)
    expect(state2.schedule.interruptions[0].newTaskId).toBe(state2.activeTaskId)
  })

  it('does nothing when there is no active task', () => {
    useAppStore.getState().interruptTask('Urgent Bug', 15)
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.schedule.tasks.length).toBe(0)
  })

  it('overwrites previous paused task when interrupting again', () => {
    useAppStore.getState().startTask('Task A', 30)
    useAppStore.getState().activeTaskId!
    useAppStore.getState().interruptTask('Interruption B', 15)
    const taskBId = useAppStore.getState().activeTaskId!

    // Try to interrupt again while B is active
    useAppStore.getState().interruptTask('Interruption C', 10)
    const state = useAppStore.getState()

    // B should be paused now, A is lost (flat model)
    expect(state.pausedTaskId).toBe(taskBId)
    expect(state.activeTaskId).not.toBe(taskBId)
    expect(state.schedule.tasks.find((t) => t.id === taskBId)!.status).toBe('paused')
  })
})

describe('endTask with interruption', () => {
  beforeEach(() => resetStore())

  it('keeps pausedTaskId when ending an interruption task', () => {
    useAppStore.getState().startTask('Original Task', 30)
    const originalId = useAppStore.getState().activeTaskId!
    useAppStore.getState().interruptTask('Interruption', 15)

    const timerStart = useAppStore.getState().timerStartAt!
    useAppStore.setState({ timerStartAt: timerStart - 20 * 60000 })

    useAppStore.getState().endTask()
    const state = useAppStore.getState()

    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBe(originalId)
    expect(state.timerStartAt).toBeNull()

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
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.timerStartAt).toBeNull()
  })
})

describe('resumeTask', () => {
  beforeEach(() => resetStore())

  it('resumes the paused task and triggers reschedule', () => {
    const base = new Date('2026-05-14T09:00:00')
    useAppStore.setState({
      schedule: {
        date: '2026-05-14',
        tasks: [
          {
            id: 'a',
            title: 'Original Task',
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
            title: 'Follow-up Task',
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

    useAppStore.getState().interruptTask('Interruption', 20)
    useAppStore.getState().activeTaskId!
    useAppStore.setState({ timerStartAt: Date.now() - 20 * 60000 })
    useAppStore.getState().endTask()

    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()

    expect(state.activeTaskId).toBe('a')
    expect(state.pausedTaskId).toBeNull()
    expect(state.timerStartAt).not.toBeNull()

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
    useAppStore.setState({
      schedule: {
        date: '2026-05-14',
        tasks: [
          {
            id: 'a',
            title: 'Late Task',
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

    useAppStore.getState().interruptTask('Interruption', 15)
    useAppStore.setState({ timerStartAt: Date.now() - 15 * 60000 })
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
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
  })

  it('does nothing when reschedule returns null', () => {
    useAppStore.setState({
      schedule: {
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
      activeTaskId: null,
      pausedTaskId: 'a',
      timerStartAt: null,
      view: 'timeline',
    })

    useAppStore.getState().resumeTask()
    const state = useAppStore.getState()
    expect(state.pausedTaskId).toBe('a')
  })
})
