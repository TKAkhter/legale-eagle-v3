/**
 * Multi-matter timer store — parity with old LMS activeMatterTimers localStorage.
 */
import { create } from "zustand"

export interface MatterTimerEntry {
  matterId: string
  matterTitle: string
  timerId: string
  isRunning: boolean
  pause: boolean
  startTime: number
  totalPauseTime: number
  pauseStartTime: number | null
  hours?: number
  minutes?: number
  seconds?: number
}

const STORAGE_KEY = "activeMatterTimers"
export const MAX_MATTER_TIMERS = 3

export function getActiveMatterTimers(): Record<string, MatterTimerEntry> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") || {}
  } catch {
    return {}
  }
}

export function setActiveMatterTimers(timers: Record<string, MatterTimerEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers || {}))
}

export function getElapsedMs(t: MatterTimerEntry | null | undefined): number {
  if (!t?.startTime) return 0
  const now = Date.now()
  const totalPauseTime = t.totalPauseTime || 0
  const effectiveNow = t.pause && t.pauseStartTime ? t.pauseStartTime : now
  return Math.max(effectiveNow - t.startTime - totalPauseTime, 0)
}

export function msToHMS(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return { hours: 0, minutes: 0, seconds: 0 }
  const totalSeconds = Math.floor(ms / 1000)
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":")
}

export function formatHMS(h: number, m: number, s: number): string {
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":")
}

type StopwatchStatus = "idle" | "running" | "paused"

interface StopwatchState {
  status: StopwatchStatus
  matterId: string | null
  matterTitle: string | null
  elapsed: number
  stopwatchId: string | null
  startedAt: number | null
  timers: Record<string, MatterTimerEntry>
  headerTimerId: string | null
}

interface StopwatchActions {
  hydrateFromStorage: () => void
  setTimers: (timers: Record<string, MatterTimerEntry>, headerTimerId?: string | null) => void
  upsertTimer: (entry: MatterTimerEntry) => void
  removeTimer: (matterId: string) => void
  setHeaderTimerId: (matterId: string | null) => void
  /** Legacy single-timer API used by matter detail button */
  start: (matterId: string, matterTitle: string, stopwatchId?: string) => void
  pause: () => void
  resume: () => void
  end: () => void
  tick: () => void
  setElapsed: (seconds: number) => void
  reset: () => void
}

type StopwatchStore = StopwatchState & StopwatchActions

const INITIAL: StopwatchState = {
  status: "idle",
  matterId: null,
  matterTitle: null,
  elapsed: 0,
  stopwatchId: null,
  startedAt: null,
  timers: {},
  headerTimerId: null,
}

function syncLegacyFields(timers: Record<string, MatterTimerEntry>, headerTimerId: string | null): Partial<StopwatchState> {
  const header = headerTimerId ? timers[headerTimerId] : Object.values(timers).find(t => t.isRunning) ?? Object.values(timers)[0]
  if (!header) {
    return { status: "idle", matterId: null, matterTitle: null, elapsed: 0, stopwatchId: null, startedAt: null, headerTimerId: null }
  }
  const elapsedMs = getElapsedMs(header)
  return {
    status: header.isRunning ? "running" : "paused",
    matterId: header.matterId,
    matterTitle: header.matterTitle,
    elapsed: Math.floor(elapsedMs / 1000),
    stopwatchId: header.timerId,
    startedAt: header.isRunning ? Date.now() : null,
    headerTimerId: header.matterId,
  }
}

export const useStopwatchStore = create<StopwatchStore>()((set, get) => ({
  ...INITIAL,

  hydrateFromStorage: () => {
    const timers = getActiveMatterTimers()
    const running = Object.values(timers).find(t => t.isRunning)
    const headerTimerId = running?.matterId ?? Object.keys(timers)[0] ?? null
    set({ timers, ...syncLegacyFields(timers, headerTimerId) })
  },

  setTimers: (timers, headerTimerId) => {
    setActiveMatterTimers(timers)
    const hid = headerTimerId === undefined
      ? (Object.values(timers).find(t => t.isRunning)?.matterId ?? Object.keys(timers)[0] ?? null)
      : headerTimerId
    set({ timers, ...syncLegacyFields(timers, hid) })
  },

  upsertTimer: (entry) => {
    const timers = { ...get().timers, [entry.matterId]: entry }
    get().setTimers(timers, entry.isRunning ? entry.matterId : get().headerTimerId)
  },

  removeTimer: (matterId) => {
    const timers = { ...get().timers }
    delete timers[matterId]
    get().setTimers(timers)
  },

  setHeaderTimerId: (matterId) => {
    set({ ...syncLegacyFields(get().timers, matterId) })
  },

  start: (matterId, matterTitle, stopwatchId) => {
    const entry: MatterTimerEntry = {
      matterId,
      matterTitle,
      timerId: stopwatchId ?? `local-${matterId}`,
      isRunning: true,
      pause: false,
      startTime: Date.now(),
      totalPauseTime: 0,
      pauseStartTime: null,
    }
    get().upsertTimer(entry)
  },

  pause: () => {
    const { matterId, timers } = get()
    if (!matterId || !timers[matterId]) return
    const t = timers[matterId]
    get().upsertTimer({
      ...t,
      isRunning: false,
      pause: true,
      pauseStartTime: Date.now(),
    })
  },

  resume: () => {
    const { matterId, timers } = get()
    if (!matterId || !timers[matterId]) return
    const t = timers[matterId]
    const extraPause = t.pauseStartTime ? Date.now() - t.pauseStartTime : 0
    get().upsertTimer({
      ...t,
      isRunning: true,
      pause: false,
      totalPauseTime: (t.totalPauseTime || 0) + extraPause,
      pauseStartTime: null,
    })
  },

  end: () => {
    const { matterId } = get()
    if (matterId) get().removeTimer(matterId)
    else set(INITIAL)
  },

  tick: () => {
    const { timers, headerTimerId } = get()
    const updated = { ...timers }
    let changed = false
    for (const id of Object.keys(updated)) {
      const t = updated[id]
      if (!t.isRunning) continue
      const { hours, minutes, seconds } = msToHMS(getElapsedMs(t))
      updated[id] = { ...t, hours, minutes, seconds }
      changed = true
    }
    if (changed) {
      set({ timers: updated, ...syncLegacyFields(updated, headerTimerId) })
    }
  },

  setElapsed: (elapsed) => set({ elapsed }),

  reset: () => {
    setActiveMatterTimers({})
    set(INITIAL)
  },
}))

export const selectStopwatchStatus = (s: StopwatchStore) => s.status
export const selectStopwatchElapsed = (s: StopwatchStore) => s.elapsed
export const selectStopwatchMatter = (s: StopwatchStore) => ({
  matterId: s.matterId,
  matterTitle: s.matterTitle,
})
