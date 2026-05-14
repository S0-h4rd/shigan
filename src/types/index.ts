export type TaskStatus =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'deferred'

export type RuntimeStatus = 'idle' | 'active' | 'paused'

export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  plannedDurationMinutes: number
  actualDurationMinutes?: number
  status: TaskStatus
  scheduledStart?: Date
  scheduledEnd?: Date
  originalScheduledStart?: Date
  originalScheduledEnd?: Date
  actualStart?: Date
  actualEnd?: Date
  category?: string
  priority: Priority
  revisionCount: number
}

export interface Interruption {
  id: string
  timestamp: Date
  interruptedTaskId: string
  newTaskId: string
  description: string
  durationMinutes?: number
}

export interface DaySchedule {
  date: string
  tasks: Task[]
  interruptions: Interruption[]
}

export interface TimeInsight {
  date: string
  totalPlannedMinutes: number
  totalActualMinutes: number
  totalInterruptionMinutes: number
  completedTasks: number
  cancelledTasks: number
  deferredTasks: number
  categoryBreakdown: Record<string, number>
  revisionCount: number
}

export type ViewMode = 'timeline' | 'report'

export interface AppState {
  schedule: DaySchedule
  activeTaskId: string | null
  pausedTaskId: string | null
  timerStartAt: number | null
  view: ViewMode
}
