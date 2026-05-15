import { useMemo } from 'react'
import type { DaySchedule, Task } from '@/types'
import { generateTimeInsight } from '@/core/report'
import ExportButton from './ExportButton'

const HOUR_HEIGHT = 80
const START_HOUR = 6
const END_HOUR = 23

interface BlankSlot {
  start: number
  end: number
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
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

  const firstStart = minutesFromMidnight(sorted[0].scheduledStart!)
  if (firstStart > dayStart) {
    slots.push({ start: dayStart, end: firstStart })
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const currEnd = minutesFromMidnight(sorted[i].scheduledEnd!)
    const nextStart = minutesFromMidnight(sorted[i + 1].scheduledStart!)
    if (nextStart > currEnd) {
      slots.push({ start: currEnd, end: nextStart })
    }
  }

  const lastEnd = minutesFromMidnight(sorted[sorted.length - 1].scheduledEnd!)
  if (lastEnd < dayEnd) {
    slots.push({ start: lastEnd, end: dayEnd })
  }

  return slots
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}时${m}分`
  }
  return `${minutes}分`
}

interface ReportViewProps {
  schedule: DaySchedule
}

export default function ReportView({ schedule }: ReportViewProps) {
  const insight = useMemo(() => generateTimeInsight(schedule), [schedule])

  const blankMinutes = useMemo(() => {
    const slots = findBlankSlots(schedule.tasks)
    return slots.reduce((sum, slot) => sum + (slot.end - slot.start), 0)
  }, [schedule.tasks])

  const totalTasks = schedule.tasks.length
  const remainingTasks = totalTasks - insight.completedTasks - insight.cancelledTasks

  const categoryEntries = useMemo(() => {
    const entries = Object.entries(insight.categoryBreakdown).sort(
      (a, b) => b[1] - a[1],
    )
    if (entries.length === 0) return []
    const maxValue = Math.max(...entries.map(([, v]) => v))
    return entries.map(([label, value]) => ({ label, value, maxValue }))
  }, [insight.categoryBreakdown])

  const insightParts: string[] = []
  if (insight.completedTasks > 0) {
    insightParts.push(`${insight.completedTasks} 项任务按时完成`)
  }
  if (insight.cancelledTasks > 0) {
    insightParts.push(`${insight.cancelledTasks} 项被跳过`)
  }
  if (insight.deferredTasks > 0) {
    insightParts.push(`${insight.deferredTasks} 项延后到明天`)
  }
  if (insight.revisionCount > 0) {
    insightParts.push(`计划被调整了 ${insight.revisionCount} 次`)
  }
  const insightText = insightParts.join(' · ')

  const interruptionSources = useMemo(() => {
    const interruptionTaskIds = new Set(
      schedule.interruptions.map((i) => i.newTaskId),
    )

    const map = new Map<
      string,
      { count: number; duration: number }
    >()

    for (const interruption of schedule.interruptions) {
      const task = schedule.tasks.find(
        (t) =>
          t.id === interruption.newTaskId &&
          interruptionTaskIds.has(t.id) &&
          t.status === 'completed' &&
          t.actualDurationMinutes != null,
      )
      if (!task) continue

      const desc = interruption.description
      const existing = map.get(desc)
      if (existing) {
        existing.count += 1
        existing.duration += task.actualDurationMinutes!
      } else {
        map.set(desc, {
          count: 1,
          duration: task.actualDurationMinutes!,
        })
      }
    }

    return Array.from(map.entries())
      .map(([description, { count, duration }]) => ({
        description,
        count,
        duration,
      }))
      .sort((a, b) => b.duration - a.duration)
  }, [schedule])

  if (schedule.tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="text-4xl text-text-muted">○</span>
        <p className="mt-4 text-text-secondary font-medium">今天还没有记录</p>
        <p className="text-sm text-text-muted mt-1">
          点击时间线开始你的第一个任务
        </p>
      </div>
    )
  }

  const completedWidth =
    totalTasks > 0 ? (insight.completedTasks / totalTasks) * 100 : 0
  const cancelledWidth =
    totalTasks > 0 ? (insight.cancelledTasks / totalTasks) * 100 : 0
  const remainingWidth =
    totalTasks > 0 ? (remainingTasks / totalTasks) * 100 : 0

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-4 space-y-5">
      {/* Date title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-text-primary text-center flex-1">
          {schedule.date}
        </h2>
        <ExportButton schedule={schedule} />
      </div>

      {/* Metric cards 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-subtle border border-border-light rounded-lg px-3 py-3">
          <p className="text-xs text-text-muted">计划时长</p>
          <p className="text-xl font-mono font-tabular text-text-primary mt-1">
            {formatMinutes(insight.totalPlannedMinutes)}
          </p>
        </div>
        <div className="bg-bg-subtle border border-border-light rounded-lg px-3 py-3">
          <p className="text-xs text-text-muted">实际时长</p>
          <p className="text-xl font-mono font-tabular text-text-primary mt-1">
            {formatMinutes(insight.totalActualMinutes)}
          </p>
        </div>
        <div className="bg-bg-subtle border border-border-light rounded-lg px-3 py-3">
          <p className="text-xs text-text-muted">打断时长</p>
          <p className="text-xl font-mono font-tabular text-text-primary mt-1">
            {formatMinutes(insight.totalInterruptionMinutes)}
          </p>
        </div>
        <div className="bg-bg-subtle border border-border-light rounded-lg px-3 py-3">
          <p className="text-xs text-text-muted">空白时长</p>
          <p className="text-xl font-mono font-tabular text-text-primary mt-1">
            {formatMinutes(blankMinutes)}
          </p>
        </div>
      </div>

      {/* Completion rate progress bar */}
      <div>
        <div className="h-4 rounded-full bg-bg-muted overflow-hidden flex">
          {completedWidth > 0 && (
            <div
              className="h-full bg-active-bg"
              style={{ width: `${completedWidth}%` }}
            />
          )}
          {cancelledWidth > 0 && (
            <div
              className="h-full bg-done-bg"
              style={{ width: `${cancelledWidth}%` }}
            />
          )}
          {remainingWidth > 0 && (
            <div
              className="h-full bg-plan-bg"
              style={{ width: `${remainingWidth}%` }}
            />
          )}
        </div>
        <p className="text-xs text-text-muted mt-2 text-center">
          {insight.completedTasks} 项完成 · {insight.cancelledTasks} 项跳过 ·{' '}
          {remainingTasks} 项进行中
        </p>
      </div>

      {/* Category breakdown */}
      {categoryEntries.length > 0 && (
        <div className="space-y-2">
          {categoryEntries.map(({ label, value, maxValue }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-16 text-xs text-text-secondary truncate">
                {label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-scheduled-text"
                  style={{
                    width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%',
                  }}
                />
              </div>
              <span className="w-12 text-xs text-text-secondary text-right font-mono font-tabular">
                {formatMinutes(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Insight text */}
      {insightText && (
        <p className="text-sm text-text-secondary">{insightText}</p>
      )}

      {/* Interruption sources */}
      {interruptionSources.length > 0 && (
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">
            主要打断来源
          </p>
          <div className="space-y-1.5">
            {interruptionSources.map(({ description, count, duration }) => (
              <div
                key={description}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-secondary truncate">
                  {description}
                </span>
                <span className="text-text-muted font-mono font-tabular whitespace-nowrap ml-2">
                  {count}次 · {duration}分钟
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
