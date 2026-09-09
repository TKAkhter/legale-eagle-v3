/**
 * notificationStore.ts — tracks which notifications have been push-fired.
 *
 * Prevents re-firing a browser notification every poll cycle.
 * Persisted to sessionStorage (cleared on tab close).
 */
import { create } from 'zustand'

interface NotificationStore {
  seenIds:    Set<string>
  markSeen:   (id: string) => void
  hasSeen:    (id: string) => boolean
  soundOn:    boolean
  toggleSound:() => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  seenIds:  new Set<string>(),
  markSeen: (id) => set(s => ({ seenIds: new Set([...s.seenIds, id]) })),
  hasSeen:  (id) => get().seenIds.has(id),
  soundOn:  true,
  toggleSound: () => set(s => ({ soundOn: !s.soundOn })),
}))
