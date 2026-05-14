import { useMemo } from 'react'
import type { Task } from '@/types'
import { formatDurationShort } from '@/core/timer'
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'

interface ActiveTaskBarProps {
  task: Task
}

export default function ActiveTaskBar({ task }: ActiveTaskBarProps) {
  const endTask = useAppStore((state) => state.endTask)
  const now = useNow(1000)

  const remainingMs = useMemo(() => {
    if (!task.scheduledEnd) return 0
    return task.scheduledEnd.getTime() - now
  }, [task.scheduledEnd, now])

  const elapsedMs = useMemo(() => {
    if (!task.actualStart) return 0
    return now - task.actualStart.getTime()
  }, [task.actualStart, now])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-active-text text-xs font-mono">▶</span>
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
          <button
            onClick={endTask}
            className="shrink-0 px-4 py-2 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
