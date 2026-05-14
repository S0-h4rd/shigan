import type { Task } from '@/types'
import { formatTime } from '@/core/timer'

interface TaskBlockProps {
  task: Task
  style?: React.CSSProperties
  isInterrupt?: boolean
}

const statusTheme: Record<
  string,
  { bg: string; text: string; border: string; icon: string; label: string }
> = {
  scheduled: {
    bg: 'bg-plan-bg',
    text: 'text-plan-text',
    border: 'border-plan-border',
    icon: '○',
    label: '计划',
  },
  active: {
    bg: 'bg-active-bg',
    text: 'text-active-text',
    border: 'border-active-border',
    icon: '▶',
    label: '进行中',
  },
  paused: {
    bg: 'bg-interrupt-bg',
    text: 'text-interrupt-text',
    border: 'border-interrupt-border',
    icon: '⏸',
    label: '已暂停',
  },
  completed: {
    bg: 'bg-done-bg',
    text: 'text-done-text',
    border: 'border-done-border',
    icon: '✓',
    label: '完成',
  },
  cancelled: {
    bg: 'bg-done-bg',
    text: 'text-done-text',
    border: 'border-done-border',
    icon: '✗',
    label: '取消',
  },
  deferred: {
    bg: 'bg-plan-bg',
    text: 'text-plan-text',
    border: 'border-plan-border',
    icon: '○',
    label: '延后',
  },
  overtime: {
    bg: 'bg-overtime-bg',
    text: 'text-overtime-text',
    border: 'border-overtime-border',
    icon: '!',
    label: '超时',
  },
}

function getTheme(task: Task) {
  // 超时判定：计划已结束但状态仍为 active
  if (
    task.status === 'active' &&
    task.scheduledEnd &&
    new Date() > task.scheduledEnd
  ) {
    return statusTheme.overtime
  }
  return statusTheme[task.status] ?? statusTheme.scheduled
}

function getDurationLabel(task: Task): string {
  if (task.status === 'completed' && task.actualDurationMinutes) {
    return `${task.actualDurationMinutes}分钟`
  }
  if (task.status === 'active' && task.scheduledEnd) {
    const remaining = Math.max(
      0,
      Math.round((task.scheduledEnd.getTime() - Date.now()) / 60000),
    )
    return `剩余 ${remaining} 分钟`
  }
  if (task.plannedDurationMinutes) {
    return `${task.plannedDurationMinutes}分钟`
  }
  return ''
}

function getTimeRange(task: Task): string {
  if (task.actualStart && task.actualEnd) {
    return `${formatTime(task.actualStart)}–${formatTime(task.actualEnd)}`
  }
  if (task.scheduledStart && task.scheduledEnd) {
    return `${formatTime(task.scheduledStart)}–${formatTime(task.scheduledEnd)}`
  }
  return ''
}

export default function TaskBlock({ task, style, isInterrupt }: TaskBlockProps) {
  const theme = getTheme(task)
  const timeRange = getTimeRange(task)
  const duration = getDurationLabel(task)

  const leftClass = isInterrupt ? 'left-20 right-2' : 'left-14 right-2'

  return (
    <div
      className={`absolute ${leftClass} rounded-md border ${theme.bg} ${theme.border} py-2 px-3 shadow-sm transition-all hover:shadow-md`}
      style={style}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${theme.text} font-mono`}
          aria-hidden="true"
        >
          {theme.icon}
        </span>
        <span className={`text-sm font-medium ${theme.text} truncate`}>
          {task.title}
        </span>
        <span
          className={`ml-auto text-xs ${theme.text} opacity-80 shrink-0`}
        >
          {theme.label}
        </span>
      </div>
      {(timeRange || duration) && (
        <div className={`mt-1 text-xs ${theme.text} opacity-70 font-mono font-tabular`}>
          {timeRange}
          {timeRange && duration && ' · '}
          {duration}
        </div>
      )}
    </div>
  )
}
