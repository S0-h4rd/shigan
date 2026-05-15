import { useMemo } from 'react'
import type { DaySchedule, Task } from '@/types'
import TaskBlock from './TaskBlock'
import EmptyState from './EmptyState'

const HOUR_HEIGHT = 80 // 每小时 80px，1 分钟 ≈ 1.33px
const START_HOUR = 6
const END_HOUR = 23

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function getTaskStyle(task: Task): React.CSSProperties {
  const start = task.scheduledStart
    ? minutesFromMidnight(task.scheduledStart)
    : 0
  const end = task.scheduledEnd
    ? minutesFromMidnight(task.scheduledEnd)
    : start + task.plannedDurationMinutes
  const top = (start - START_HOUR * 60) * (HOUR_HEIGHT / 60)
  const minHeight = Math.max((end - start) * (HOUR_HEIGHT / 60), 48) // 最小高度 48px，确保内容可见
  return { top: `${top}px`, minHeight: `${minHeight}px` }
}

interface BlankSlot {
  start: number // minutes from START_HOUR
  end: number
}

function findBlankSlots(tasks: Task[]): BlankSlot[] {
  const sorted = [...tasks]
    .filter((t) => t.scheduledStart && t.scheduledEnd)
    .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())

  const slots: BlankSlot[] = []
  const dayStart = START_HOUR * 60
  const dayEnd = END_HOUR * 60

  if (sorted.length === 0) {
    slots.push({ start: dayStart, end: dayEnd })
    return slots
  }

  // 开始到第一个任务之间的空白
  const firstStart = minutesFromMidnight(sorted[0].scheduledStart!)
  if (firstStart > dayStart) {
    slots.push({ start: dayStart, end: firstStart })
  }

  // 任务之间的空白
  for (let i = 0; i < sorted.length - 1; i++) {
    const currEnd = minutesFromMidnight(sorted[i].scheduledEnd!)
    const nextStart = minutesFromMidnight(sorted[i + 1].scheduledStart!)
    if (nextStart > currEnd) {
      slots.push({ start: currEnd, end: nextStart })
    }
  }

  // 最后一个任务到结束之间的空白
  const lastEnd = minutesFromMidnight(sorted[sorted.length - 1].scheduledEnd!)
  if (lastEnd < dayEnd) {
    slots.push({ start: lastEnd, end: dayEnd })
  }

  return slots
}

interface TimelineProps {
  schedule: DaySchedule
  onAddPlan: () => void
  onBackfill?: (start: Date, end: Date) => void
}

export default function Timeline({ schedule, onAddPlan, onBackfill }: TimelineProps) {
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    [],
  )

  const sortedTasks = useMemo(
    () =>
      [...schedule.tasks].sort(
        (a, b) =>
          (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0),
      ),
    [schedule.tasks],
  )

  const blankSlots = useMemo(() => findBlankSlots(schedule.tasks), [schedule.tasks])

  const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT

  // 哪些任务是打断插入的
  const interruptTaskIds = useMemo(
    () => new Set(schedule.interruptions.map((i) => i.newTaskId).filter(Boolean)),
    [schedule.interruptions],
  )

  return (
    <div className="relative w-full max-w-[480px] mx-auto">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-medium text-text-secondary">
          今日时间线
        </span>
        <button
          onClick={onAddPlan}
          className="px-3 py-1.5 text-xs font-medium text-scheduled-text border border-scheduled-border rounded-full hover:bg-scheduled-bg transition-colors"
        >
          + 添加计划
        </button>
      </div>
      {schedule.tasks.length === 0 ? (
        <EmptyState variant="first-use" />
      ) : (
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {/* 小时刻度背景 */}
          {hours.map((hour, idx) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: `${idx * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <div className="w-12 text-right pr-2 pt-1">
                <span className="text-xs text-text-muted font-mono font-tabular">
                  {hour}:00
                </span>
              </div>
              <div className="flex-1 border-t border-dashed border-border-light" />
            </div>
          ))}

          {/* 空白时间段 */}
          {blankSlots.map((slot, idx) => {
            const top = (slot.start - START_HOUR * 60) * (HOUR_HEIGHT / 60)
            const height = (slot.end - slot.start) * (HOUR_HEIGHT / 60)
            const slotStart = new Date(`${schedule.date}T00:00:00`)
            slotStart.setHours(Math.floor(slot.start / 60), slot.start % 60, 0, 0)
            const slotEnd = new Date(`${schedule.date}T00:00:00`)
            slotEnd.setHours(Math.floor(slot.end / 60), slot.end % 60, 0, 0)

            return (
              <div
                key={`blank-${idx}`}
                onClick={() => onBackfill?.(slotStart, slotEnd)}
                className="absolute left-14 right-2 rounded-md border border-dashed border-empty-border bg-empty-bg cursor-pointer hover:bg-bg-subtle transition-colors"
                style={{ top: `${top}px`, height: `${height}px` }}
                role="button"
                aria-label={`未记录时间段 ${formatTime(slotStart)} - ${formatTime(slotEnd)}`}
              >
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs text-empty-text">未记录</span>
                </div>
              </div>
            )
          })}

          {/* 任务色块 */}
          {sortedTasks.map((task) => (
            <TaskBlock
              key={task.id}
              task={task}
              style={getTaskStyle(task)}
              isInterrupt={interruptTaskIds.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
