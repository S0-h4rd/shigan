import { useCallback, useEffect, useRef } from 'react'
import type { Task } from '@/types'

interface EndReminderModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onEnd?: () => void
  onExtend?: () => void
  onDefer?: () => void
}

export default function EndReminderModal({
  task,
  isOpen,
  onClose,
  onEnd,
  onExtend,
  onDefer,
}: EndReminderModalProps) {
  const handleEnd = useCallback(() => {
    onEnd?.()
    onClose()
  }, [onEnd, onClose])

  const handleExtend = useCallback(() => {
    onExtend?.()
    onClose()
  }, [onExtend, onClose])

  const handleDefer = useCallback(() => {
    onDefer?.()
    onClose()
  }, [onDefer, onClose])

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !task) return null

  return (
    <>
      <div
        data-testid="backdrop"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
        <div
          className="bg-bg-base rounded-xl shadow-2xl px-6 py-5 max-w-[320px] w-full mx-4 pointer-events-auto relative"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-reminder-title"
          aria-describedby="end-reminder-desc"
        >
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
          <h3 id="end-reminder-title" className="text-lg font-semibold text-text-primary">
            时间到了
          </h3>
          <p id="end-reminder-desc" className="text-sm text-text-secondary mt-1">
            任务 "{task.title}" 计划时间已结束
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleEnd}
              className="w-full px-4 py-2.5 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors"
            >
              结束
            </button>
            <button
              onClick={handleExtend}
              className="w-full px-4 py-2.5 bg-bg-subtle text-text-primary text-sm font-medium rounded-lg border border-border-light hover:bg-bg-muted transition-colors"
            >
              延长 10 分钟
            </button>
            <button
              onClick={handleDefer}
              className="w-full px-4 py-2.5 bg-bg-subtle text-text-primary text-sm font-medium rounded-lg border border-border-light hover:bg-bg-muted transition-colors"
            >
              延后到明天
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
