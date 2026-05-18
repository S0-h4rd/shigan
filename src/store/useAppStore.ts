import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { reschedule } from '@/core/reschedule'
import { compactSchedule } from '@/core/compactSchedule'
import { formatDateKey } from '@/core/date'
import type { AppState, DaySchedule, Interruption, Task, ViewMode } from '@/types'

function emptySchedule(date: string): DaySchedule {
  return {
    date,
    tasks: [],
    interruptions: [],
  }
}

export function todayKey(): string {
  const now = new Date()
  const hour = now.getHours()
  if (hour < 4) {
    now.setDate(now.getDate() - 1)
  }
  return formatDateKey(now)
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

function getScheduleForDate(
  schedules: Record<string, DaySchedule>,
  date: string,
): DaySchedule {
  return schedules[date] ?? emptySchedule(date)
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
  addPlannedTask: (
    title: string,
    plannedDurationMinutes: number,
  ) => void
  skipTask: (taskId: string) => void
  activateTask: (taskId: string) => void
  extendTask: (additionalMinutes: number) => void
  deferTask: () => void
  backfillTask: (
    title: string,
    plannedDurationMinutes: number,
    start: Date,
    end: Date,
    category?: string,
  ) => void
  setView: (view: ViewMode) => void
  setCurrentDate: (date: string) => void
}

const _today = todayKey()
const _emptyToday = emptySchedule(_today)

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentDate: _today,
      schedules: { [_today]: _emptyToday },
      schedule: _emptyToday,
      activeTaskId: null,
      pausedTaskId: null,
      timerStartAt: null,
      view: 'timeline',

      startTask: (title, plannedDurationMinutes, category) => {
        const { currentDate, schedules, activeTaskId } = get()
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

        const schedule = getScheduleForDate(schedules, currentDate)
        const newSchedule = {
          ...schedule,
          tasks: [...schedule.tasks, newTask],
        }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: newTask.id,
          timerStartAt: Date.now(),
        })
      },

      endTask: () => {
        const { currentDate, schedules, activeTaskId, pausedTaskId, timerStartAt } = get()
        if (!activeTaskId || !timerStartAt) return

        const now = new Date()
        const actualDurationMinutes = Math.round(
          (Date.now() - timerStartAt) / 60000,
        )

        const schedule = getScheduleForDate(schedules, currentDate)
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
        const newSchedule = { ...schedule, tasks: updatedTasks }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: null,
          timerStartAt: null,
          pausedTaskId: isInterruption ? pausedTaskId : null,
        })
      },

      interruptTask: (title, plannedDurationMinutes, category) => {
        const { currentDate, schedules, activeTaskId, timerStartAt } = get()
        if (!activeTaskId || !timerStartAt) return

        const now = new Date()
        const elapsedMinutes = Math.round((Date.now() - timerStartAt) / 60000)

        const schedule = getScheduleForDate(schedules, currentDate)

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

        const newSchedule = {
          ...schedule,
          tasks: [...pausedTasks, newTask],
          interruptions: [...schedule.interruptions, interruption],
        }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: newTask.id,
          pausedTaskId: activeTaskId,
          timerStartAt: Date.now(),
        })
      },

      resumeTask: () => {
        const { currentDate, schedules, pausedTaskId } = get()
        if (!pausedTaskId) return

        const schedule = getScheduleForDate(schedules, currentDate)
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
        const newSchedule = { ...schedule, tasks: updatedTasks }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: resumedTask?.status === 'active' ? resumedTask.id : null,
          pausedTaskId: null,
          timerStartAt: resumedTask?.status === 'active' ? Date.now() : null,
        })
      },

      addPlannedTask: (title, plannedDurationMinutes) => {
        const { currentDate, schedules } = get()
        const schedule = getScheduleForDate(schedules, currentDate)
        const now = new Date()

        let defaultStart = now
        const lastTask = [...schedule.tasks]
          .filter((t) => t.scheduledEnd)
          .sort(
            (a, b) =>
              (b.scheduledEnd?.getTime() ?? 0) -
              (a.scheduledEnd?.getTime() ?? 0),
          )[0]

        if (lastTask?.scheduledEnd) {
          defaultStart = lastTask.scheduledEnd
        } else {
          const ms = defaultStart.getTime()
          const thirtyMin = 30 * 60000
          defaultStart = new Date(Math.ceil(ms / thirtyMin) * thirtyMin)
        }

        const newTask: Task = {
          id: generateId(),
          title,
          plannedDurationMinutes,
          status: 'scheduled',
          scheduledStart: defaultStart,
          scheduledEnd: new Date(
            defaultStart.getTime() + plannedDurationMinutes * 60000,
          ),
          priority: 'medium',
          revisionCount: 0,
        }

        const newSchedule = {
          ...schedule,
          tasks: [...schedule.tasks, newTask],
        }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
        })
      },

      skipTask: (taskId) => {
        const { currentDate, schedules } = get()
        const schedule = getScheduleForDate(schedules, currentDate)
        const task = schedule.tasks.find((t) => t.id === taskId)
        if (!task || task.status !== 'scheduled') return

        const compacted = compactSchedule(schedule.tasks, taskId)
        if (!compacted) return

        const newSchedule = { ...schedule, tasks: compacted }
        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
        })
      },
      activateTask: (taskId) => {
        const { currentDate, schedules, activeTaskId } = get()
        if (activeTaskId) return

        const schedule = getScheduleForDate(schedules, currentDate)
        const now = new Date()
        const updatedTasks = schedule.tasks.map((t) => {
          if (t.id !== taskId) return t
          return {
            ...t,
            status: 'active' as Task['status'],
            actualStart: now,
          }
        })

        const newSchedule = { ...schedule, tasks: updatedTasks }
        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: taskId,
          timerStartAt: Date.now(),
        })
      },

      extendTask: (additionalMinutes) => {
        const { currentDate, schedules, activeTaskId } = get()
        if (!activeTaskId) return

        const schedule = getScheduleForDate(schedules, currentDate)
        const updatedTasks = schedule.tasks.map((t) => {
          if (t.id !== activeTaskId) return t
          return {
            ...t,
            scheduledEnd: t.scheduledEnd
              ? new Date(t.scheduledEnd.getTime() + additionalMinutes * 60000)
              : undefined,
            revisionCount: t.revisionCount + 1,
          }
        })

        const newSchedule = { ...schedule, tasks: updatedTasks }
        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
        })
      },

      deferTask: () => {
        const { currentDate, schedules, activeTaskId } = get()
        if (!activeTaskId) return

        const schedule = getScheduleForDate(schedules, currentDate)
        const updatedTasks = schedule.tasks.map((t) => {
          if (t.id !== activeTaskId) return t
          return {
            ...t,
            status: 'deferred' as Task['status'],
            scheduledStart: undefined,
            scheduledEnd: undefined,
            revisionCount: t.revisionCount + 1,
          }
        })

        const newSchedule = { ...schedule, tasks: updatedTasks }
        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
          activeTaskId: null,
          timerStartAt: null,
        })
      },

      backfillTask: (title, plannedDurationMinutes, start, end, category) => {
        if (!title.trim()) return
        const { currentDate, schedules } = get()
        const schedule = getScheduleForDate(schedules, currentDate)

        const actualDurationMinutes = Math.round(
          (end.getTime() - start.getTime()) / 60000,
        )

        const newTask: Task = {
          id: generateId(),
          title: title.trim(),
          plannedDurationMinutes,
          status: 'completed',
          scheduledStart: start,
          scheduledEnd: end,
          actualStart: start,
          actualEnd: end,
          actualDurationMinutes,
          priority: 'medium',
          revisionCount: 0,
          category,
        }

        const newSchedule = {
          ...schedule,
          tasks: [...schedule.tasks, newTask],
        }

        set({
          schedules: { ...schedules, [currentDate]: newSchedule },
          schedule: newSchedule,
        })
      },

      setView: (view) => set({ view }),

      setCurrentDate: (date) => {
        const { schedules } = get()
        const schedule = getScheduleForDate(schedules, date)
        set({
          currentDate: date,
          schedules: schedules[date] ? schedules : { ...schedules, [date]: schedule },
          schedule,
        })
      },
    }),
    {
      name: 'shigan-storage',
      partialize: (state) => ({
        currentDate: state.currentDate,
        schedules: state.schedules,
        activeTaskId: state.activeTaskId,
        pausedTaskId: state.pausedTaskId,
        timerStartAt: state.timerStartAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return

        // Migrate from old format (single schedule) to new format (schedules record)
        if (!state.schedules && state.schedule) {
          const date = state.schedule.date || todayKey()
          state.schedules = { [date]: state.schedule }
          state.currentDate = date
        }

        if (!state.currentDate) {
          state.currentDate = todayKey()
        }

        // Revive Date objects for all stored schedules
        for (const date of Object.keys(state.schedules)) {
          state.schedules[date] = reviveDates(state.schedules[date])
        }

        state.schedule = getScheduleForDate(state.schedules, state.currentDate)
      },
    },
  ),
)

const defaultDate = todayKey()

export const defaultState = {
  currentDate: defaultDate,
  schedules: { [defaultDate]: emptySchedule(defaultDate) },
  schedule: emptySchedule(defaultDate),
  activeTaskId: null,
  pausedTaskId: null,
  timerStartAt: null,
  view: 'timeline' as ViewMode,
}
