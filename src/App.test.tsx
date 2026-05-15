import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

// Mock zustand persist middleware
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}))

describe('App view toggle', () => {
  it('toggles between timeline and report views', () => {
    render(<App />)
    // Default shows timeline
    expect(screen.getByText('今日时间线')).toBeInTheDocument()

    // Click report button
    const reportButton = screen.getByText('报告')
    fireEvent.click(reportButton)

    // Should show report view (mock schedule has tasks, so report renders with date header)
    expect(screen.getByText('2026-05-13')).toBeInTheDocument()

    // Click again to go back
    fireEvent.click(screen.getByText('时间线'))
    expect(screen.getByText('今日时间线')).toBeInTheDocument()
  })
})
