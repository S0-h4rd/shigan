import type { Task } from '@/types'

/**
 * 自动重排算法。
 * 纯函数：输入旧任务列表 + 打断信息，输出新任务列表。
 * 不涉 UI、不涉存储。
 */
export function reschedule(
  tasks: Task[],
  interruptedTaskId: string,
  newTask: Task,
): Task[] | null {
  // 新任务必须有实际时长，否则无法计算延迟
  if (!newTask.actualDurationMinutes || newTask.actualDurationMinutes <= 0) {
    return null
  }

  const delayMs = newTask.actualDurationMinutes * 60000
  const interruptedTask = tasks.find((t) => t.id === interruptedTaskId)
  if (!interruptedTask) return null

  const anchorTime = interruptedTask.scheduledStart?.getTime() ?? 0

  return tasks.map((task) => {
    // 被打断的任务本身
    if (task.id === interruptedTaskId) {
      const hasStarted = task.actualStart != null
      const newStart = hasStarted
        ? task.scheduledStart
        : task.scheduledStart
          ? new Date(task.scheduledStart.getTime() + delayMs)
          : undefined
      const newEnd = task.scheduledEnd
        ? new Date(task.scheduledEnd.getTime() + delayMs)
        : undefined

      return {
        ...task,
        scheduledStart: newStart,
        scheduledEnd: newEnd,
        revisionCount: task.revisionCount + 1,
      }
    }

    // 后续未开始的计划任务整体后推
    if (
      task.status === 'scheduled' &&
      task.scheduledStart &&
      task.scheduledStart.getTime() >= anchorTime
    ) {
      return {
        ...task,
        scheduledStart: new Date(task.scheduledStart.getTime() + delayMs),
        scheduledEnd: task.scheduledEnd
          ? new Date(task.scheduledEnd.getTime() + delayMs)
          : undefined,
        revisionCount: task.revisionCount + 1,
      }
    }

    return task
  })
}
