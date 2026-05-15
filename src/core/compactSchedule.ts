import type { Task } from '@/types'

export function compactSchedule(
  tasks: Task[],
  skippedTaskId: string,
): Task[] | null {
  const skippedTask = tasks.find((t) => t.id === skippedTaskId)
  if (!skippedTask || !skippedTask.scheduledStart || !skippedTask.scheduledEnd) {
    return null
  }

  const gapMs =
    skippedTask.scheduledEnd.getTime() - skippedTask.scheduledStart.getTime()
  const anchorTime = skippedTask.scheduledStart.getTime()

  return tasks.map((task) => {
    if (task.id === skippedTaskId) {
      return {
        ...task,
        status: 'cancelled' as Task['status'],
        scheduledStart: undefined,
        scheduledEnd: undefined,
        revisionCount: task.revisionCount + 1,
      }
    }

    if (
      task.status === 'scheduled' &&
      task.scheduledStart &&
      task.scheduledStart.getTime() >= anchorTime
    ) {
      return {
        ...task,
        scheduledStart: new Date(task.scheduledStart.getTime() - gapMs),
        scheduledEnd: task.scheduledEnd
          ? new Date(task.scheduledEnd.getTime() - gapMs)
          : undefined,
        revisionCount: task.revisionCount + 1,
      }
    }

    return task
  })
}
