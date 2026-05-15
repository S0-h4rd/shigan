import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders first-use variant', () => {
    render(<EmptyState variant="first-use" />)
    expect(screen.getByText('你的今天是什么样的？')).toBeInTheDocument()
    expect(screen.getByText('点击下方的「开始」按钮，记录你的第一个任务')).toBeInTheDocument()
  })

  it('renders no-plans variant', () => {
    render(<EmptyState variant="no-plans" />)
    expect(screen.getByText('今天没有计划')).toBeInTheDocument()
    expect(screen.getByText('随时点击开始记录')).toBeInTheDocument()
  })

  it('renders all-blank variant', () => {
    render(<EmptyState variant="all-blank" />)
    expect(screen.getByText('0% 已记录')).toBeInTheDocument()
    expect(screen.getByText('点击按钮，看见你的时间')).toBeInTheDocument()
  })
})
