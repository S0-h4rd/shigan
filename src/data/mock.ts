import type { DaySchedule, Task } from '@/types'

const today = new Date().toISOString().slice(0, 10)

function t(hour: number, minute: number = 0): Date {
  return new Date(`${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
}

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    plannedDurationMinutes: 30,
    status: 'scheduled',
    priority: 'medium',
    revisionCount: 0,
    ...overrides,
  }
}

export const mockSchedule: DaySchedule = {
  date: today,
  tasks: [
    makeTask({
      id: '1',
      title: '晨会',
      status: 'completed',
      plannedDurationMinutes: 30,
      scheduledStart: t(9),
      scheduledEnd: t(9, 30),
      actualStart: t(9),
      actualEnd: t(9, 35),
      actualDurationMinutes: 35,
      category: '会议',
    }),
    makeTask({
      id: '2',
      title: '写代码',
      status: 'active',
      plannedDurationMinutes: 90,
      scheduledStart: t(9, 35),
      scheduledEnd: t(11, 5),
      actualStart: t(9, 35),
      category: '深度工作',
    }),
    makeTask({
      id: '3',
      title: '午饭',
      status: 'scheduled',
      plannedDurationMinutes: 60,
      scheduledStart: t(11, 5),
      scheduledEnd: t(12, 5),
      category: '休息',
    }),
    makeTask({
      id: '4',
      title: '紧急 bug',
      status: 'completed',
      plannedDurationMinutes: 15,
      scheduledStart: t(10, 30),
      scheduledEnd: t(10, 45),
      actualStart: t(10, 30),
      actualEnd: t(10, 50),
      actualDurationMinutes: 20,
      category: '打断',
    }),
    makeTask({
      id: '5',
      title: '设计评审',
      status: 'scheduled',
      plannedDurationMinutes: 60,
      scheduledStart: t(13),
      scheduledEnd: t(14),
      category: '会议',
    }),
    makeTask({
      id: '6',
      title: '文档整理',
      status: 'scheduled',
      plannedDurationMinutes: 45,
      scheduledStart: t(14, 15),
      scheduledEnd: t(15),
      category: '深度工作',
    }),
  ],
  interruptions: [
    {
      id: 'i1',
      timestamp: t(10, 30),
      interruptedTaskId: '2',
      newTaskId: '4',
      description: '紧急 bug',
      durationMinutes: 20,
    },
  ],
}
