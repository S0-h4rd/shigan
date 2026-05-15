import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

const PRESETS = [
  { label: '深度工作', duration: 90, category: '深度工作' },
  { label: '会议', duration: 30, category: '会议' },
  { label: '休息', duration: 15, category: '休息' },
  { label: '上厕所', duration: 5, category: '生活' },
  { label: '喝水', duration: 2, category: '生活' },
  { label: '刷手机', duration: 15, category: '休息' },
]

export default function QuickStart() {
  const startTask = useAppStore((state) => state.startTask)
  const activeTaskId = useAppStore((state) => state.activeTaskId)
  const [customTitle, setCustomTitle] = useState('')

  if (activeTaskId) return null

  const handlePreset = (label: string, duration: number, category: string) => {
    startTask(label, duration, category)
  }

  const handleCustomStart = () => {
    if (!customTitle.trim()) return
    startTask(customTitle.trim(), 30)
    setCustomTitle('')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-light px-4 py-3 rounded-t-xl shadow-lg z-20">
      <div className="max-w-[480px] mx-auto space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="在做什么？"
            className="flex-1 px-3 py-2 text-sm bg-bg-subtle border border-border-light rounded-lg focus:outline-none focus:border-border-medium text-text-primary placeholder:text-text-placeholder"
            onKeyDown={(e) => e.key === 'Enter' && handleCustomStart()}
          />
          <button
            onClick={handleCustomStart}
            className="shrink-0 px-4 py-2 bg-text-primary text-bg-base text-sm font-medium rounded-lg hover:bg-text-secondary transition-colors"
          >
            开始
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.label, p.duration, p.category)}
              className="px-3 py-1.5 text-xs bg-bg-subtle text-text-secondary border border-border-light rounded-full hover:bg-bg-muted transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
