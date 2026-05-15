import { useCallback, useMemo, useState } from 'react'
import type { Task } from '@/types'
import { formatDurationShort } from '@/core/timer'
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'

const DEFAULT_INTERRUPTION_DURATION = 30

interface ActiveTaskBarProps {
  task: Task
}

export default function ActiveTaskBar({ task }: ActiveTaskBarProps) {
  const endTask = useAppStore((state) => state.endTask)
  const interruptTask = useAppStore((state) => state.interruptTask)
  const now = useNow(1000)

  const [isInterrupting, setIsInterrupting] = useState(false)
  const [interruptTitle, setInterruptTitle] = useState('')

  const remainingMs = useMemo(() => {
    if (!task.scheduledEnd) return 0
    return task.scheduledEnd.getTime() - now
  }, [task.scheduledEnd, now])

  const elapsedMs = useMemo(() => {
    if (!task.actualStart) return 0
    return now - task.actualStart.getTime()
  }, [task.actualStart, now])

  const handleStartInterruption = useCallback(() => {
    const trimmed = interruptTitle.trim()
    if (!trimmed) return
    interruptTask(trimmed, DEFAULT_INTERRUPTION_DURATION)
    setInterruptTitle('')
    setIsInterrupting(false)
  }, [interruptTitle, interruptTask])

  const handleCancelInterruption = useCallback(() => {
    setInterruptTitle('')
    setIsInterrupting(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleStartInterruption()
      }
    },
    [handleStartInterruption],
  )

  if (isInterrupting) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-interruption-bg border-t border-interruption-border px-4 py-3 rounded-t-xl shadow-lg z-20">
        <div className="max-w-[480px] mx-auto space-y-2">
          <div className="text-xs text-interruption-text font-medium">
            <span aria-hidden="true">⏸</span> 当前被打断：{task.title}（已暂停）
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={interruptTitle}
              onChange={(e) => setInterruptTitle(e.target.value)}
              placeholder="发生了什么？"
              aria-label="发生了什么？"
              className="flex-1 px-3 py-2 text-sm bg-bg-base border border-interruption-border rounded-lg focus:outline-none focus:border-interruption-text text-text-primary placeholder:text-text-muted"
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              onClick={handleStartInterruption}
              aria-label="开始打断任务"
              className="shrink-0 px-4 py-2 bg-interruption-text text-bg-base text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              开始
            </button>
            <button
              onClick={handleCancelInterruption}
              aria-label="取消打断"
              className="shrink-0 px-4 py-2 bg-bg-base text-text-primary text-sm font-medium rounded-lg border border-border-light hover:bg-bg-subtle transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-active-text text-xs font-mono">▶</span>
              <span className="text-sm font-medium text-text-primary truncate">
                {task.title}
              </span>
            </div>
            <div className="text-xs text-text-muted font-mono font-tabular mt-0.5">
              {remainingMs > 0
                ? `${formatDurationShort(remainingMs)} 剩余`
                : '已超时'}
              <span className="mx-1">·</span>
              已用 {formatDurationShort(elapsedMs)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsInterrupting(true)}
              aria-label="有事插入"
              className="px-3 py-2 text-interruption-text text-sm font-medium rounded-lg border border-interruption-border hover:bg-interruption-bg transition-colors"
            >
              有事插入
            </button>
            <button
              onClick={endTask}
              aria-label="完成任务"
              className="px-4 py-2 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
