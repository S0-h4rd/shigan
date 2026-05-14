import type { DaySchedule, TimeInsight } from '@/types'

export function generateReport(schedule: DaySchedule): TimeInsight {
  const completedTasks = schedule.tasks.filter((t) => t.status === 'completed').length
  const cancelledTasks = schedule.tasks.filter((t) => t.status === 'cancelled').length
  const deferredTasks = schedule.tasks.filter((t) => t.status === 'deferred').length

  const totalPlannedMinutes = schedule.tasks.reduce(
    (sum, t) => sum + t.plannedDurationMinutes,
    0,
  )

  const totalActualMinutes = schedule.tasks.reduce(
    (sum, t) => sum + (t.actualDurationMinutes ?? 0),
    0,
  )

  const totalInterruptionMinutes = schedule.interruptions.reduce(
    (sum, i) => sum + (i.durationMinutes ?? 0),
    0,
  )

  const categoryBreakdown: Record<string, number> = {}
  for (const task of schedule.tasks) {
    if (task.actualDurationMinutes && task.actualDurationMinutes > 0) {
      const cat = task.category ?? '未分类'
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + task.actualDurationMinutes
    }
  }

  const revisionCount = schedule.tasks.reduce((sum, t) => sum + t.revisionCount, 0)

  return {
    date: schedule.date,
    totalPlannedMinutes,
    totalActualMinutes,
    totalInterruptionMinutes,
    completedTasks,
    cancelledTasks,
    deferredTasks,
    categoryBreakdown,
    revisionCount,
  }
}
