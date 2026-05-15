import { useCallback, useState } from 'react'
import type { DaySchedule } from '@/types'

interface ExportButtonProps {
  schedule: DaySchedule
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportJSON(schedule: DaySchedule): string {
  return JSON.stringify(schedule, null, 2)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function exportCSV(schedule: DaySchedule): string {
  const headers = ['ID', 'Title', 'Status', 'Planned Minutes', 'Actual Minutes', 'Category', 'Start', 'End']
  const lines: string[] = [headers.join(',')]

  for (const task of schedule.tasks) {
    const cells = [
      task.id,
      escapeCSV(task.title),
      task.status,
      task.plannedDurationMinutes,
      task.actualDurationMinutes ?? '',
      escapeCSV(task.category ?? ''),
      task.scheduledStart?.toISOString() ?? '',
      task.scheduledEnd?.toISOString() ?? '',
    ]
    lines.push(cells.join(','))
  }

  return lines.join('\n')
}

export default function ExportButton({ schedule }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  const handleExportJSON = useCallback(() => {
    const content = exportJSON(schedule)
    downloadBlob(content, `shigan-${schedule.date}.json`, 'application/json')
    setOpen(false)
  }, [schedule])

  const handleExportCSV = useCallback(() => {
    const content = exportCSV(schedule)
    downloadBlob(content, `shigan-${schedule.date}.csv`, 'text/csv')
    setOpen(false)
  }, [schedule])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-light rounded-full hover:bg-bg-muted transition-colors"
      >
        导出数据
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-bg-base border border-border-light rounded-lg shadow-lg z-10 overflow-hidden">
          <button
            onClick={handleExportJSON}
            className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-subtle transition-colors"
          >
            导出 JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-subtle transition-colors"
          >
            导出 CSV
          </button>
        </div>
      )}
    </div>
  )
}
