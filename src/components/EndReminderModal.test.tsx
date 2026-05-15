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

  it('does not render when task is null', () => {
    render(<EndReminderModal task={null} isOpen={true} onClose={vi.fn()} />)
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
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onEnd and onClose when clicking 结束', () => {
    const onEnd = vi.fn()
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} onEnd={onEnd} />)
    fireEvent.click(screen.getByText('结束'))
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onExtend and onClose when clicking 延长 10 分钟', () => {
    const onExtend = vi.fn()
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} onExtend={onExtend} />)
    fireEvent.click(screen.getByText('延长 10 分钟'))
    expect(onExtend).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onDefer and onClose when clicking 延后到明天', () => {
    const onDefer = vi.fn()
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} onDefer={onDefer} />)
    fireEvent.click(screen.getByText('延后到明天'))
    expect(onDefer).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} />)
    const backdrop = screen.getByTestId('backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn()
    render(<EndReminderModal task={mockTask} isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
