import { useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

const DURATIONS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '60分钟', value: 60 },
  { label: '90分钟', value: 90 },
]

interface PlanTaskPanelProps {
  onClose: () => void
}

export default function PlanTaskPanel({ onClose }: PlanTaskPanelProps) {
  const addPlannedTask = useAppStore((state) => state.addPlannedTask)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    addPlannedTask(trimmed, duration)
    setTitle('')
    onClose()
  }, [title, duration, addPlannedTask, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="计划做什么？"
            aria-label="计划做什么？"
            className="flex-1 px-3 py-2 text-sm bg-bg-subtle border border-border-light rounded-lg focus:outline-none focus:border-border-medium text-text-primary placeholder:text-text-placeholder"
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            aria-label="添加计划任务"
            className="shrink-0 px-4 py-2 bg-plan-bg text-plan-text text-sm font-medium rounded-lg border border-plan-border hover:bg-plan-border transition-colors"
          >
            添加
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
                  ? 'bg-plan-bg text-plan-text border-plan-border'
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
