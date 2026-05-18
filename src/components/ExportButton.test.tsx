import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExportButton from './ExportButton'
import type { DaySchedule } from '@/types'

describe('ExportButton', () => {
  const mockSchedule: DaySchedule = {
    date: '2026-05-15',
    tasks: [
      {
        id: '1',
        title: '晨会',
        plannedDurationMinutes: 30,
        status: 'completed',
        actualDurationMinutes: 30,
        priority: 'medium',
        revisionCount: 0,
      },
    ],
    interruptions: [],
  }

  it('renders export options', () => {
    render(<ExportButton schedule={mockSchedule} />)
    fireEvent.click(screen.getByRole('button', { name: '导出数据' }))
    expect(screen.getByText('导出 JSON')).toBeInTheDocument()
    expect(screen.getByText('导出 CSV')).toBeInTheDocument()
  })
})
