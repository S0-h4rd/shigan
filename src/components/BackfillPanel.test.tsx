import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BackfillPanel from './BackfillPanel'

describe('BackfillPanel', () => {
  const defaultProps = {
    start: new Date('2026-05-15T10:00:00'),
    end: new Date('2026-05-15T10:30:00'),
    onClose: vi.fn(),
  }

  it('renders pre-filled time range', () => {
    render(<BackfillPanel {...defaultProps} />)
    expect(screen.getByText('10:00 - 10:30')).toBeInTheDocument()
    // The default duration label at the top
    expect(screen.getByText('30分钟', { selector: 'span' })).toBeInTheDocument()
  })

  it('calls onClose when cancel clicked', () => {
    render(<BackfillPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('disables submit when title is empty', () => {
    render(<BackfillPanel {...defaultProps} />)
    const submit = screen.getByRole('button', { name: '记录任务' })
    expect(submit).toBeDisabled()
  })
})
