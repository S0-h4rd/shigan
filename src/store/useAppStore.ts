import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { reschedule } from '@/core/reschedule'
import { compactSchedule } from '@/core/compactSchedule'
import { formatDateKey } from '@/core/date'
import type { AppState, DaySchedule, Interruption, Task, ViewMode } from '@/types'

function emptySchedule(date: string): DaySchedule {
  return { date, tasks: [], interruptions: [] }
}

export function todayKey(): string {
  const now = new Date()
  if (now.getHours() < 4) now.setDate(now.getDate() - 1)
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
      scheduledStart: t.scheduledStart ? new Date(t.scheduledStart) : undefined,
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

export function getSchedule(
  schedules: Record<string, DaySchedule>,
  date: string,
): DaySchedule {
  return schedules[date] ?? emptySchedule(date)
}

interface Runtime {
  activeTaskId: string | null
  startedAt: number | null
  pausedTaskId: string | null
  pausedElapsedMinutes: number | null
  date: string
}

function defaultRuntime(date: string): Runtime {
  return {
    activeTaskId: null,
    startedAt: null,
    pausedTaskId: null,
    pausedElapsedMinutes: null,
    date,
  }
}

export interface AppStore extends AppState {
  runtime: Runtime
  schedule: DaySchedule

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
  addPlannedTask: (title: string, plannedDurationMinutes: number) => void
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

export function getActiveTask(state: Pick<AppStore, 'schedules' | 'currentDate' | 'runtime'>): Task | null {
  const { schedules, currentDate, runtime } = state
  if (!runtime.activeTaskId) return null
  const schedule = getSchedule(schedules, currentDate)
  return schedule.tasks.find((t) => t.id === runtime.activeTaskId && t.status === 'active') ?? null
}

export function getPausedTask(state: Pick<AppStore, 'schedules' | 'currentDate' | 'runtime'>): Task | null {
  const { schedules, currentDate, runtime } = state
  if (!runtime.pausedTaskId) return null
  const schedule = getSchedule(schedules, currentDate)
  return schedule.tasks.find((t) => t.id === runtime.pausedTaskId) ?? null
}

const _today = todayKey()

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const update = (partial: Partial<AppStore>) => {
        const nextSchedules = partial.schedules ?? get().schedules
        const nextDate = partial.currentDate ?? get().currentDate
        const nextSchedule = getSchedule(nextSchedules, nextDate)
        set({ ...partial, schedule: nextSchedule })
      }

      return {
        currentDate: _today,
        schedules: { [_today]: emptySchedule(_today) },
        runtime: defaultRuntime(_today),
        schedule: emptySchedule(_today),
        view: 'timeline',

        startTask: (title, plannedDurationMinutes, category) => {
          const { currentDate, schedules, runtime } = get()
          if (runtime.activeTaskId) {
            const s = getSchedule(schedules, currentDate)
            const stillActive = s.tasks.some(
              (t) => t.id === runtime.activeTaskId && t.status === 'active',
            )
            if (stillActive) return
          }

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

          const schedule = getSchedule(schedules, currentDate)
          const newSchedule = {
            ...schedule,
            tasks: [...schedule.tasks, newTask],
          }

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: {
              ...runtime,
              activeTaskId: newTask.id,
              startedAt: Date.now(),
              date: currentDate,
            },
          })
        },

        endTask: () => {
          const { currentDate, schedules, runtime } = get()
          if (!runtime.activeTaskId || !runtime.startedAt) return

          const now = new Date()
          const actualDurationMinutes = Math.round(
            (Date.now() - runtime.startedAt) / 60000,
          )

          const schedule = getSchedule(schedules, currentDate)
          const updatedTasks = schedule.tasks.map((t) => {
            if (t.id !== runtime.activeTaskId) return t
            return {
              ...t,
              status: 'completed' as Task['status'],
              actualEnd: now,
              actualDurationMinutes,
            }
          })

          const isInterruption = runtime.pausedTaskId != null
          const newSchedule = { ...schedule, tasks: updatedTasks }

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: {
              ...runtime,
              activeTaskId: null,
              startedAt: null,
              pausedTaskId: isInterruption ? runtime.pausedTaskId : null,
            },
          })
        },

        interruptTask: (title, plannedDurationMinutes, category) => {
          const { currentDate, schedules, runtime } = get()
          if (!runtime.activeTaskId || !runtime.startedAt) return

          const s = getSchedule(schedules, currentDate)
          const stillActive = s.tasks.some(
            (t) => t.id === runtime.activeTaskId && t.status === 'active',
          )
          if (!stillActive) return

          const now = new Date()
          const elapsedMinutes = Math.round(
            (Date.now() - runtime.startedAt) / 60000,
          )

          const schedule = getSchedule(schedules, currentDate)

          const pausedTasks = schedule.tasks.map((t) => {
            if (t.id !== runtime.activeTaskId) return t
            return {
              ...t,
              status: 'paused' as Task['status'],
              actualDurationMinutes: elapsedMinutes,
            }
          })

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

          const interruption: Interruption = {
            id: generateId(),
            timestamp: now,
            interruptedTaskId: runtime.activeTaskId,
            newTaskId: newTask.id,
            description: title,
          }

          const newSchedule = {
            ...schedule,
            tasks: [...pausedTasks, newTask],
            interruptions: [...schedule.interruptions, interruption],
          }

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: {
              ...runtime,
              activeTaskId: newTask.id,
              pausedTaskId: runtime.activeTaskId,
              pausedElapsedMinutes: elapsedMinutes,
              startedAt: Date.now(),
              date: currentDate,
            },
          })
        },

        resumeTask: () => {
          const { currentDate, schedules, runtime } = get()
          if (!runtime.pausedTaskId) return

          const schedule = getSchedule(schedules, currentDate)
          const interruptedTask = schedule.tasks.find(
            (t) => t.id === runtime.pausedTaskId,
          )
          if (!interruptedTask) return

          const interruptionTask = schedule.tasks.find(
            (t) =>
              t.status === 'completed' &&
              schedule.interruptions.some(
                (i) =>
                  i.newTaskId === t.id &&
                  i.interruptedTaskId === runtime.pausedTaskId,
              ),
          )
          if (!interruptionTask || !interruptionTask.actualDurationMinutes)
            return

          const rescheduled = reschedule(
            schedule.tasks,
            runtime.pausedTaskId,
            interruptionTask,
          )
          if (!rescheduled) return

          const now = new Date()
          const rescheduledTask = rescheduled.find(
            (t) => t.id === runtime.pausedTaskId,
          )
          const dayEnd = new Date(rescheduledTask?.scheduledStart || now)
          dayEnd.setHours(23, 59, 59, 999)

          const updatedTasks = rescheduled.map((task) => {
            if (task.id !== runtime.pausedTaskId) return task

            const isDeferred =
              task.scheduledEnd != null &&
              task.scheduledEnd.getTime() > dayEnd.getTime()

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

          const resumedTask = updatedTasks.find(
            (t) => t.id === runtime.pausedTaskId,
          )
          const newSchedule = { ...schedule, tasks: updatedTasks }

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: {
              ...runtime,
              activeTaskId:
                resumedTask?.status === 'active' ? resumedTask.id : null,
              pausedTaskId: null,
              pausedElapsedMinutes: null,
              startedAt:
                resumedTask?.status === 'active' ? Date.now() : null,
            },
          })
        },

        addPlannedTask: (title, plannedDurationMinutes) => {
          const { currentDate, schedules } = get()
          const schedule = getSchedule(schedules, currentDate)
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

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
          })
        },

        skipTask: (taskId) => {
          const { currentDate, schedules } = get()
          const schedule = getSchedule(schedules, currentDate)
          const task = schedule.tasks.find((t) => t.id === taskId)
          if (!task || task.status !== 'scheduled') return

          const compacted = compactSchedule(schedule.tasks, taskId)
          if (!compacted) return

          const newSchedule = { ...schedule, tasks: compacted }
          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
          })
        },

        activateTask: (taskId) => {
          const { currentDate, schedules, runtime } = get()
          if (runtime.activeTaskId) {
            const s = getSchedule(schedules, currentDate)
            const stillActive = s.tasks.some(
              (t) =>
                t.id === runtime.activeTaskId && t.status === 'active',
            )
            if (stillActive) return
          }

          const schedule = getSchedule(schedules, currentDate)
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
          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: {
              ...runtime,
              activeTaskId: taskId,
              startedAt: Date.now(),
              date: currentDate,
            },
          })
        },

        extendTask: (additionalMinutes) => {
          const { currentDate, schedules, runtime } = get()
          if (!runtime.activeTaskId) return

          const schedule = getSchedule(schedules, currentDate)
          const updatedTasks = schedule.tasks.map((t) => {
            if (t.id !== runtime.activeTaskId) return t
            return {
              ...t,
              scheduledEnd: t.scheduledEnd
                ? new Date(
                    t.scheduledEnd.getTime() + additionalMinutes * 60000,
                  )
                : undefined,
              revisionCount: t.revisionCount + 1,
            }
          })

          const newSchedule = { ...schedule, tasks: updatedTasks }
          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
          })
        },

        deferTask: () => {
          const { currentDate, schedules, runtime } = get()
          if (!runtime.activeTaskId) return

          const schedule = getSchedule(schedules, currentDate)
          const updatedTasks = schedule.tasks.map((t) => {
            if (t.id !== runtime.activeTaskId) return t
            return {
              ...t,
              status: 'deferred' as Task['status'],
              scheduledStart: undefined,
              scheduledEnd: undefined,
              revisionCount: t.revisionCount + 1,
            }
          })

          const newSchedule = { ...schedule, tasks: updatedTasks }
          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
            runtime: { ...runtime, activeTaskId: null, startedAt: null },
          })
        },

        backfillTask: (
          title,
          plannedDurationMinutes,
          start,
          end,
          category,
        ) => {
          if (!title.trim()) return
          const { currentDate, schedules } = get()
          const schedule = getSchedule(schedules, currentDate)

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

          update({
            schedules: { ...schedules, [currentDate]: newSchedule },
          })
        },

        setView: (view) => update({ view }),

        setCurrentDate: (date) => {
          const { schedules, runtime } = get()
          const schedule = getSchedule(schedules, date)
          const newRuntime =
            runtime.date !== date ? defaultRuntime(date) : runtime

          update({
            currentDate: date,
            schedules: schedules[date]
              ? schedules
              : { ...schedules, [date]: schedule },
            runtime: newRuntime,
          })
        },
      }
    },
    {
      name: 'shigan-storage-v2',
      partialize: (state) => ({
        currentDate: state.currentDate,
        schedules: state.schedules,
        runtime: state.runtime,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return

        if (!state.schedules && (state as any).schedule) {
          const date = (state as any).schedule.date || todayKey()
          state.schedules = { [date]: (state as any).schedule }
          state.currentDate = date
        }

        if (!state.currentDate) {
          state.currentDate = todayKey()
        }

        for (const date of Object.keys(state.schedules)) {
          state.schedules[date] = reviveDates(state.schedules[date])
        }

        if (state.runtime && state.runtime.date !== state.currentDate) {
          state.runtime = defaultRuntime(state.currentDate)
        }

        if (state.runtime?.activeTaskId) {
          const schedule = getSchedule(
            state.schedules,
            state.currentDate,
          )
          const task = schedule.tasks.find(
            (t) => t.id === state.runtime.activeTaskId,
          )
          if (!task || task.status !== 'active') {
            state.runtime.activeTaskId = null
            state.runtime.startedAt = null
          }
        }

        if (state.runtime?.pausedTaskId) {
          const schedule = getSchedule(
            state.schedules,
            state.currentDate,
          )
          const task = schedule.tasks.find(
            (t) => t.id === state.runtime.pausedTaskId,
          )
          if (!task) {
            state.runtime.pausedTaskId = null
            state.runtime.pausedElapsedMinutes = null
          }
        }

        state.schedule = getSchedule(state.schedules, state.currentDate)
      },
    },
  ),
)

export const defaultState = {
  currentDate: _today,
  schedules: { [_today]: emptySchedule(_today) },
  runtime: defaultRuntime(_today),
  schedule: emptySchedule(_today),
  view: 'timeline' as ViewMode,
}
