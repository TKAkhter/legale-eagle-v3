import { create } from 'zustand'

/**
 * stopwatchStore.ts
 *
 * Tracks the live time-logging stopwatch state.
 * Syncs with POST /api/activity/stopwatch (Start | Pause | End | Resume).
 *
 * The backend is the source of truth for elapsed time.
 * The frontend ticks a local counter for display only — it re-syncs
 * with the backend on every Start/Pause/End call.
 */

type StopwatchStatus = 'idle' | 'running' | 'paused'

interface StopwatchState {
  status:      StopwatchStatus
  matterId:    string | null
  matterTitle: string | null
  elapsed:     number           // seconds, local tick
  stopwatchId: string | null
  startedAt:   number | null    // Date.now() when last started
}

interface StopwatchActions {
  start:   (matterId: string, matterTitle: string, stopwatchId?: string) => void
  pause:   () => void
  resume:  () => void
  end:     () => void
  tick:    () => void           // called by interval in StopwatchWidget
  setElapsed: (seconds: number) => void
  reset:   () => void
}

type StopwatchStore = StopwatchState & StopwatchActions

const INITIAL: StopwatchState = {
  status:      'idle',
  matterId:    null,
  matterTitle: null,
  elapsed:     0,
  stopwatchId: null,
  startedAt:   null,
}

export const useStopwatchStore = create<StopwatchStore>()((set, get) => ({
  ...INITIAL,

  start: (matterId, matterTitle, stopwatchId) =>
    set({
      status:      'running',
      matterId,
      matterTitle,
      stopwatchId: stopwatchId ?? null,
      startedAt:   Date.now(),
    }),

  pause: () =>
    set((s) => ({
      status: 'paused',
      // Capture elapsed up to now before pausing
      elapsed: s.startedAt
        ? s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000)
        : s.elapsed,
      startedAt: null,
    })),

  resume: () =>
    set({ status: 'running', startedAt: Date.now() }),

  end: () => set(INITIAL),

  tick: () =>
    set((s) => {
      if (s.status !== 'running' || !s.startedAt) return s
      return {
        elapsed: s.elapsed + Math.floor((Date.now() - (s.startedAt ?? Date.now())) / 1000),
        startedAt: Date.now(),
      }
    }),

  setElapsed: (elapsed) => set({ elapsed }),

  reset: () => set(INITIAL),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectStopwatchStatus  = (s: StopwatchStore) => s.status
export const selectStopwatchElapsed = (s: StopwatchStore) => s.elapsed
export const selectStopwatchMatter  = (s: StopwatchStore) => ({
  matterId:    s.matterId,
  matterTitle: s.matterTitle,
})

/** Format elapsed seconds as HH:MM:SS */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
