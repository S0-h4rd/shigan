import { useEffect, useState } from 'react'
import type { Task } from '@/types'
import { useNotifications } from './useNotifications'

export function useEndReminder(activeTask: Task | null) {
  const [isOpen, setIsOpen] = useState(false)
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const { notify, resetTag } = useNotifications()

  useEffect(() => {
    if (!activeTask) {
      setIsOpen(false)
      setDismissedId(null)
      return
    }

    const remainingMs = activeTask.scheduledEnd
      ? activeTask.scheduledEnd.getTime() - Date.now()
      : Infinity

    if (remainingMs <= 0 && activeTask.id !== dismissedId) {
      setIsOpen(true)
      notify(
        '时间到了',
        `任务 "${activeTask.title}" 计划时间已结束`,
        `end-${activeTask.id}`,
      )
    }

    if (
      remainingMs > 0 &&
      remainingMs <= 5 * 60 * 1000
    ) {
      notify(
        '即将结束',
        `任务 "${activeTask.title}" 还剩 5 分钟`,
        `warning-${activeTask.id}`,
      )
    }
  }, [
    activeTask?.id,
    activeTask?.scheduledEnd?.getTime(),
    activeTask?.title,
    dismissedId,
    notify,
  ])

  useEffect(() => {
    if (activeTask?.id) {
      resetTag(`end-${activeTask.id}`)
      resetTag(`warning-${activeTask.id}`)
    }
  }, [activeTask?.id, resetTag])

  return {
    isOpen,
    onClose: () => {
      setIsOpen(false)
      if (activeTask) setDismissedId(activeTask.id)
    },
    onDismiss: () => {
      setIsOpen(false)
      if (activeTask) setDismissedId(activeTask.id)
    },
    reset: () => setDismissedId(null),
  }
}
