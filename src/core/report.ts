import type { DaySchedule, TimeInsight } from '@/types'

export function generateTimeInsight(schedule: DaySchedule): TimeInsight {
  let totalPlannedMinutes = 0
  let totalActualMinutes = 0
  let completedTasks = 0
  let cancelledTasks = 0
  let deferredTasks = 0
  let revisionCount = 0
  const categoryBreakdown: Record<string, number> = {}

  for (const task of schedule.tasks) {
    if (task.status !== 'cancelled') {
      totalPlannedMinutes += task.plannedDurationMinutes
    }

    if (task.status === 'completed' || task.status === 'active') {
      if (task.actualDurationMinutes != null) {
        totalActualMinutes += task.actualDurationMinutes
      }
    }

    if (task.status === 'completed') {
      completedTasks++
    } else if (task.status === 'cancelled') {
      cancelledTasks++
    } else if (task.status === 'deferred') {
      deferredTasks++
    }

    revisionCount += task.revisionCount

    if (task.actualDurationMinutes != null) {
      const category = task.category || '未分类'
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + task.actualDurationMinutes
    }
  }

  const interruptionTaskIds = new Set(
    schedule.interruptions.map((i) => i.newTaskId)
  )

  let totalInterruptionMinutes = 0
  for (const task of schedule.tasks) {
    if (
      interruptionTaskIds.has(task.id) &&
      task.status === 'completed' &&
      task.actualDurationMinutes != null
    ) {
      totalInterruptionMinutes += task.actualDurationMinutes
    }
  }

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
