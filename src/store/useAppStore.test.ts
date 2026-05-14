import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore, defaultState } from './useAppStore'

function resetStore() {
  useAppStore.setState(defaultState)
}

describe('interruptTask', () => {
  beforeEach(() => resetStore())

  it('pauses the active task and starts a new interruption task', () => {
    useAppStore.getState().startTask('原任务', 30)
    const state1 = useAppStore.getState()
    const originalId = state1.activeTaskId!
    expect(state1.pausedTaskId).toBeNull()

    const timerStart = state1.timerStartAt!
    useAppStore.setState({ timerStartAt: timerStart - 10 * 60000 })

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

    expect(state2.schedule.interruptions.length).toBe(1)
    expect(state2.schedule.interruptions[0].interruptedTaskId).toBe(originalId)
    expect(state2.schedule.interruptions[0].newTaskId).toBe(state2.activeTaskId)
  })

  it('does nothing when there is no active task', () => {
    useAppStore.getState().interruptTask('紧急 bug', 15)
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.schedule.tasks.length).toBe(0)
  })

  it('overwrites previous paused task when interrupting again', () => {
    useAppStore.getState().startTask('任务A', 30)
    const taskAId = useAppStore.getState().activeTaskId!
    useAppStore.getState().interruptTask('打断B', 15)
    const taskBId = useAppStore.getState().activeTaskId!

    // Try to interrupt again while B is active
    useAppStore.getState().interruptTask('打断C', 10)
    const state = useAppStore.getState()

    // B should be paused now, A is lost (flat model)
    expect(state.pausedTaskId).toBe(taskBId)
    expect(state.activeTaskId).not.toBe(taskBId)
    expect(state.schedule.tasks.find((t) => t.id === taskBId)!.status).toBe('paused')
  })
})
