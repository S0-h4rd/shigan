import { useCallback, useRef } from 'react'

export function useNotifications() {
  const sentTags = useRef<Set<string>>(new Set())

  const requestPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title: string, body: string, tag?: string) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const notificationTag = tag ?? 'shigan-reminder'
    if (sentTags.current.has(notificationTag)) return

    sentTags.current.add(notificationTag)
    // Allow re-send after 60 seconds
    setTimeout(() => sentTags.current.delete(notificationTag), 60000)

    new Notification(title, {
      body,
      icon: '/icon-192.svg',
      tag: notificationTag,
    })
  }, [])

  const resetTag = useCallback((tag: string) => {
    sentTags.current.delete(tag)
  }, [])

  return { requestPermission, notify, resetTag }
}
