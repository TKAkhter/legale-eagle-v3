/**
 * usePushNotifications.ts — Web Notifications API wrapper.
 *
 * Requests permission on first call, then can fire browser notifications
 * even when the app is in the background.
 *
 * Usage:
 *   const { permission, requestPermission, notify } = usePushNotifications()
 *   notify({ title: 'Task overdue', body: 'File court documents is due today', onClick: () => navigate('/tasks') })
 */
import { useState, useCallback } from 'react'

export type NotificationPermission = 'default' | 'granted' | 'denied'

interface NotifyOptions {
  title:    string
  body?:    string
  icon?:    string
  onClick?: () => void
  tag?:     string        // prevents duplicate notifications with same tag
}

interface UsePushNotifications {
  permission:        NotificationPermission
  supported:         boolean
  requestPermission: () => Promise<NotificationPermission>
  notify:            (opts: NotifyOptions) => void
}

export function usePushNotifications(): UsePushNotifications {
  const supported = typeof window !== 'undefined' && 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? (Notification.permission as NotificationPermission) : 'denied'
  )

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermission)
    return result as NotificationPermission
  }, [supported])

  const notify = useCallback(({ title, body, icon = '/icons/icon-192.png', onClick, tag }: NotifyOptions) => {
    if (!supported || permission !== 'granted') return
    try {
      const n = new Notification(title, { body, icon, tag, requireInteraction: false })
      if (onClick) n.onclick = () => { window.focus(); onClick(); n.close() }
      // Auto-close after 6 seconds
      setTimeout(() => n.close(), 6000)
    } catch { /* notification blocked */ }
  }, [supported, permission])

  return { permission, supported, requestPermission, notify }
}
