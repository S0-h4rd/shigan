import { useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

const DURATIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '60分钟', value: 60 },
  { label: '90分钟', value: 90 },
]

interface BackfillPanelProps {
  start: Date
  end: Date
  onClose: () => void
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export default function BackfillPanel({ start, end, onClose }: BackfillPanelProps) {
  const backfillTask = useAppStore((state) => state.backfillTask)
  const [title, setTitle] = useState('')

  const defaultDuration = Math.round((end.getTime() - start.getTime()) / 60000)
  const [duration, setDuration] = useState(
    DURATIONS.find((d) => d.value === defaultDuration)?.value ?? defaultDuration,
  )

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    const actualEnd = new Date(start.getTime() + duration * 60000)
    backfillTask(trimmed, duration, start, actualEnd)
    setTitle('')
    onClose()
  }, [title, duration, start, backfillTask, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary font-mono font-tabular">
            {formatTime(start)} - {formatTime(end)}
          </span>
          <span className="text-xs text-text-muted">{defaultDuration}分钟</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="这段时间在做什么？"
            aria-label="这段时间在做什么？"
            className="flex-1 px-3 py-2 text-sm bg-bg-subtle border border-border-light rounded-lg focus:outline-none focus:border-border-medium text-text-primary placeholder:text-text-placeholder"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            aria-label="记录任务"
            className="shrink-0 px-4 py-2 bg-active-bg text-active-text text-sm font-medium rounded-lg border border-active-border hover:bg-active-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            记录
          </button>
          <button
            onClick={onClose}
            aria-label="取消"
            className="shrink-0 px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            取消
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              aria-pressed={duration === d.value}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                duration === d.value
                  ? 'bg-active-bg text-active-text border-active-border'
                  : 'bg-bg-subtle text-text-secondary border-border-light hover:bg-bg-muted'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
