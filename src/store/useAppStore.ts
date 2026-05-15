import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { reschedule } from '@/core/reschedule'
import type { AppState, DaySchedule, Interruption, Task, ViewMode } from '@/types'

function emptySchedule(date: string): DaySchedule {
  return {
    date,
    tasks: [],
    interruptions: [],
  }
}

function todayKey(): string {
  const now = new Date()
  const hour = now.getHours()
  if (hour < 4) {
    now.setDate(now.getDate() - 1)
  }
  return now.toISOString().slice(0, 10)
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function reviveDates(schedule: DaySchedule): DaySchedule {
  return {
    ...schedule,
    tasks: schedule.tasks.map((t) => ({
      ...t,
      scheduledStart: t.scheduledStart
        ? new Date(t.scheduledStart)
        : undefined,
      scheduledEnd: t.scheduledEnd ? new Date(t.scheduledEnd) : undefined,
      actualStart: t.actualStart ? new Date(t.actualStart) : undefined,
      actualEnd: t.actualEnd ? new Date(t.actualEnd) : undefined,
      originalScheduledStart: t.originalScheduledStart
        ? new Date(t.originalScheduledStart)
        : undefined,
      originalScheduledEnd: t.originalScheduledEnd
        ? new Date(t.originalScheduledEnd)
        : undefined,
    })),
    interruptions: schedule.interruptions.map((i) => ({
      ...i,
      timestamp: new Date(i.timestamp),
    })),
  }
}

interface AppStore extends AppState {
  startTask: (
    title: string,
    plannedDurationMinutes: number,
    category?: string,
  ) => void
  endTask: () => void
  interruptTask: (
    title: string,
    plannedDurationMinutes: number,
    category?: string,
  ) => void
  resumeTask: () => void
  setView: (view: ViewMode) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      schedule: emptySchedule(todayKey()),
      activeTaskId: null,
      pausedTaskId: null,
      timerStartAt: null,
      view: 'timeline',

      startTask: (title, plannedDurationMinutes, category) => {
        const { schedule, activeTaskId } = get()
        if (activeTaskId) return

        const now = new Date()
        const newTask: Task = {
          id: generateId(),
          title,
          plannedDurationMinutes,
          status: 'active',
          scheduledStart: now,
          scheduledEnd: new Date(
            now.getTime() + plannedDurationMinutes * 60000,
          ),
          actualStart: now,
          priority: 'medium',
          revisionCount: 0,
          category,
        }

        set({
          schedule: {
            ...schedule,
            tasks: [...schedule.tasks, newTask],
          },
          activeTaskId: newTask.id,
          timerStartAt: Date.now(),
        })
      },

      endTask: () => {
        const { schedule, activeTaskId, pausedTaskId, timerStartAt } = get()
        if (!activeTaskId || !timerStartAt) return

        const now = new Date()
        const actualDurationMinutes = Math.round(
          (Date.now() - timerStartAt) / 60000,
        )

        const updatedTasks = schedule.tasks.map((t) => {
          if (t.id !== activeTaskId) return t
          return {
            ...t,
            status: 'completed' as Task['status'],
            actualEnd: now,
            actualDurationMinutes,
          }
        })

        const isInterruption = pausedTaskId != null

        set({
          schedule: { ...schedule, tasks: updatedTasks },
          activeTaskId: null,
          timerStartAt: null,
          pausedTaskId: isInterruption ? pausedTaskId : null,
        })
      },

      interruptTask: (title, plannedDurationMinutes, category) => {
        const { schedule, activeTaskId, timerStartAt } = get()
        if (!activeTaskId || !timerStartAt) return

        const now = new Date()
        const elapsedMinutes = Math.round((Date.now() - timerStartAt) / 60000)

        // Pause the original task
        const pausedTasks = schedule.tasks.map((t) => {
          if (t.id !== activeTaskId) return t
          return {
            ...t,
            status: 'paused' as Task['status'],
            actualDurationMinutes: elapsedMinutes,
          }
        })

        // Create new interruption task
        const newTask: Task = {
          id: generateId(),
          title,
          plannedDurationMinutes,
          status: 'active',
          scheduledStart: now,
          scheduledEnd: new Date(now.getTime() + plannedDurationMinutes * 60000),
          actualStart: now,
          priority: 'medium',
          revisionCount: 0,
          category,
        }

        // Create interruption record
        const interruption: Interruption = {
          id: generateId(),
          timestamp: now,
          interruptedTaskId: activeTaskId,
          newTaskId: newTask.id,
          description: title,
        }

        set({
          schedule: {
            ...schedule,
            tasks: [...pausedTasks, newTask],
            interruptions: [...schedule.interruptions, interruption],
          },
          activeTaskId: newTask.id,
          pausedTaskId: activeTaskId,
          timerStartAt: Date.now(),
        })
      },

      resumeTask: () => {
        const { schedule, pausedTaskId } = get()
        if (!pausedTaskId) return

        const interruptedTask = schedule.tasks.find((t) => t.id === pausedTaskId)
        if (!interruptedTask) return

        const interruptionTask = schedule.tasks.find(
          (t) =>
            t.status === 'completed' &&
            schedule.interruptions.some(
              (i) => i.newTaskId === t.id && i.interruptedTaskId === pausedTaskId,
            ),
        )
        if (!interruptionTask || !interruptionTask.actualDurationMinutes) return

        const rescheduled = reschedule(
          schedule.tasks,
          pausedTaskId,
          interruptionTask,
        )
        if (!rescheduled) {
          console.warn('resumeTask: reschedule returned null')
          return
        }

        const now = new Date()
        const rescheduledTask = rescheduled.find((t) => t.id === pausedTaskId)
        const dayEnd = new Date(rescheduledTask?.scheduledStart || now)
        dayEnd.setHours(23, 59, 59, 999)

        const updatedTasks = rescheduled.map((task) => {
          if (task.id !== pausedTaskId) return task

          const isDeferred =
            task.scheduledEnd != null && task.scheduledEnd.getTime() > dayEnd.getTime()

          if (isDeferred) {
            return {
              ...task,
              status: 'deferred' as Task['status'],
              scheduledStart: undefined,
              scheduledEnd: undefined,
            }
          }

          return {
            ...task,
            status: 'active' as Task['status'],
            actualStart: now,
          }
        })

        const resumedTask = updatedTasks.find((t) => t.id === pausedTaskId)

        set({
          schedule: { ...schedule, tasks: updatedTasks },
          activeTaskId: resumedTask?.status === 'active' ? resumedTask.id : null,
          pausedTaskId: null,
          timerStartAt: resumedTask?.status === 'active' ? Date.now() : null,
        })
      },

      setView: (view) => set({ view }),
    }),
    {
      name: 'shigan-storage',
      partialize: (state) => ({
        schedule: state.schedule,
        activeTaskId: state.activeTaskId,
        pausedTaskId: state.pausedTaskId,
        timerStartAt: state.timerStartAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.schedule = reviveDates(state.schedule)
      },
    },
  ),
)

export const defaultState = {
  schedule: emptySchedule(todayKey()),
  activeTaskId: null,
  pausedTaskId: null,
  timerStartAt: null,
  view: 'timeline' as ViewMode,
}
