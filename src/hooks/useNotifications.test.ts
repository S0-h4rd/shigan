import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNotifications } from './useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    const MockNotification = vi.fn(function (
      this: Notification & { title?: string; body?: string; icon?: string; tag?: string },
      title: string,
      opts?: NotificationOptions,
    ) {
      this.title = title
      if (opts?.body) this.body = opts.body
      if (opts?.icon) this.icon = opts.icon
      if (opts?.tag) this.tag = opts.tag
    }) as unknown as typeof Notification
    vi.stubGlobal('Notification', MockNotification as unknown as typeof Notification)
    Object.defineProperty(window.Notification, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    })
    window.Notification.requestPermission = vi.fn<
      typeof Notification.requestPermission
    >(() => Promise.resolve('granted'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests permission on enable', () => {
    const { result } = renderHook(() => useNotifications())
    result.current.requestPermission()
    expect(window.Notification.requestPermission).toHaveBeenCalled()
  })

  it('sends notification when permission is granted', () => {
    Object.defineProperty(window.Notification, 'permission', {
      value: 'granted',
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useNotifications())
    result.current.notify('Test', 'Body')
    expect(window.Notification).toHaveBeenCalledWith('Test', {
      body: 'Body',
      icon: '/icon-192.svg',
      tag: 'shigan-reminder',
    })
  })

  it('does not send when permission is denied', () => {
    Object.defineProperty(window.Notification, 'permission', {
      value: 'denied',
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => useNotifications())
    result.current.notify('Test', 'Body')
    expect(window.Notification).not.toHaveBeenCalled()
  })
})
