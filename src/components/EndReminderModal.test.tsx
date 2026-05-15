import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EndReminderModal from './EndReminderModal'
import type { Task } from '@/types'

const mockTask: Task = {
  id: '1',
  title: '写代码',
  plannedDurationMinutes: 30,
  status: 'active',
  actualStart: new Date(),
  scheduledEnd: new Date(Date.now() + 60000),
  priority: 'medium',
  revisionCount: 0,
}

describe('EndReminderModal', () => {
  it('does not render when closed', () => {
    render(<EndReminderModal task={mockTask} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('时间到了')).not.toBeInTheDocument()
  })

  it('renders task title when open', () => {
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('时间到了')).toBeInTheDocument()
    expect(screen.getByText(/写代码/)).toBeInTheDocument()
  })

  it('calls onClose when clicking X', () => {
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onEnd when clicking 结束', () => {
    const onEnd = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onEnd={onEnd} />)
    fireEvent.click(screen.getByText('结束'))
    expect(onEnd).toHaveBeenCalled()
  })

  it('calls onExtend when clicking 延长 10 分钟', () => {
    const onExtend = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onExtend={onExtend} />)
    fireEvent.click(screen.getByText('延长 10 分钟'))
    expect(onExtend).toHaveBeenCalled()
  })

  it('calls onDefer when clicking 延后到明天', () => {
    const onDefer = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={vi.fn()} onDefer={onDefer} />)
    fireEvent.click(screen.getByText('延后到明天'))
    expect(onDefer).toHaveBeenCalled()
  })
})
