import type { DaySchedule, TimeInsight } from '@/types'

function getActualMinutes(task: DaySchedule['tasks'][number], now: Date): number {
  if (task.actualDurationMinutes != null) {
    return task.actualDurationMinutes
  }

  if (task.status === 'active' && task.actualStart) {
    return Math.max(
      0,
      Math.round((now.getTime() - task.actualStart.getTime()) / 60000),
    )
  }

  return 0
}

export function generateTimeInsight(
  schedule: DaySchedule,
  now: Date = new Date(),
): TimeInsight {
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
      const actualMinutes = getActualMinutes(task, now)
      if (actualMinutes > 0) {
        totalActualMinutes += actualMinutes
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

    const actualMinutes = getActualMinutes(task, now)
    if (actualMinutes > 0) {
      const category = task.category || '未分类'
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + actualMinutes
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
      getActualMinutes(task, now) > 0
    ) {
      totalInterruptionMinutes += getActualMinutes(task, now)
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
