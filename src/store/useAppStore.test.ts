import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

function resetStore() {
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

  it('无 active 任务时，interruptTask 不执行', () => {
    useAppStore.getState().interruptTask('紧急 bug', 15)
    const state = useAppStore.getState()
    expect(state.activeTaskId).toBeNull()
    expect(state.pausedTaskId).toBeNull()
    expect(state.schedule.tasks.length).toBe(0)
  })
})
