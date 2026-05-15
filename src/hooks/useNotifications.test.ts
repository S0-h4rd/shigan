import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNotifications } from './useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    const MockNotification = vi.fn(function (this: Notification, title: string, opts?: NotificationOptions) {
      this.title = title
      Object.assign(this, opts)
      return this
    } as unknown as typeof Notification)
    vi.stubGlobal('Notification', MockNotification as unknown as typeof Notification)
    Object.defineProperty(global.Notification, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    })
    global.Notification.requestPermission = vi.fn(() =>
      Promise.resolve('granted'),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests permission on enable', () => {
    const { result } = renderHook(() => useNotifications())
    result.current.requestPermission()
    expect(global.Notification.requestPermission).toHaveBeenCalled()
  })

  it('sends notification when permission is granted', () => {
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted',
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useNotifications())
    result.current.notify('Test', 'Body')
    expect(global.Notification).toHaveBeenCalledWith('Test', {
      body: 'Body',
      icon: '/icon-192.svg',
      tag: 'shigan-reminder',
    })
  })

  it('does not send when permission is denied', () => {
    Object.defineProperty(global.Notification, 'permission', {
      value: 'denied',
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useNotifications())
    result.current.notify('Test', 'Body')
    expect(global.Notification).not.toHaveBeenCalled()
  })
})
