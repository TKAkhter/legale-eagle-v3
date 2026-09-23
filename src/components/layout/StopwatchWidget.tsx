/**
 * Header MatterTimer — always-available multi-matter stopwatch (old LMS FuseShortcuts parity).
 * Hydrates from localStorage activeMatterTimers + GET /activity/stopwatch/info?stopwatchId=
 */
import { useEffect, useState } from "react"
import {
  Badge, Box, CircularProgress, IconButton, Popover, Tooltip, Typography,
} from "@mui/material"
import PauseCircleOutlineOutlinedIcon from "@mui/icons-material/PauseCircleOutlineOutlined"
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined"
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined"
import {
  useStopwatchStore,
  getActiveMatterTimers,
  getElapsedMs,
  msToHMS,
  formatHMS,
  type MatterTimerEntry,
} from "@lib/store/stopwatchStore"
import { StopwatchEndDialog } from "./StopwatchEndDialog"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

export function StopwatchWidget() {
  const timers = useStopwatchStore(s => s.timers)
  const headerTimerId = useStopwatchStore(s => s.headerTimerId)
  const setTimers = useStopwatchStore(s => s.setTimers)
  const setHeaderTimerId = useStopwatchStore(s => s.setHeaderTimerId)
  const removeTimer = useStopwatchStore(s => s.removeTimer)
  const upsertTimer = useStopwatchStore(s => s.upsertTimer)
  const tick = useStopwatchStore(s => s.tick)
  const hydrateFromStorage = useStopwatchStore(s => s.hydrateFromStorage)

  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [endingMatterId, setEndingMatterId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    hydrateFromStorage()
    if (env.USE_STATIC_DATA) return

    async function hydrateFromApi() {
      const stored = getActiveMatterTimers()
      const hydrated: Record<string, MatterTimerEntry> = {}

      for (const matterId of Object.keys(stored)) {
        const timerId = stored[matterId]?.timerId
        if (!timerId || timerId.startsWith("local-")) {
          if (stored[matterId]) hydrated[matterId] = stored[matterId]
          continue
        }
        try {
          const res = await axiosClient.get("/api/activity/stopwatch/info", {
            params: { stopwatchId: timerId },
          })
          const d = res.data?.data ?? res.data
          if (!d || d.activityTimerStatus === "End") continue
          const isRunning = d.activityTimerStatus === "Start" || d.activityTimerStatus === "Resume"
          hydrated[matterId] = {
            ...stored[matterId],
            timerId: d.id ?? timerId,
            startTime: d.startTime ?? stored[matterId].startTime,
            totalPauseTime: d.totalPauseTime || 0,
            pauseStartTime: d.pauseStartTime ?? null,
            isRunning,
            pause: d.activityTimerStatus === "Pause",
            matterTitle: d.matterMini?.title ?? stored[matterId].matterTitle,
          }
        } catch {
          // keep local copy if API fails
          hydrated[matterId] = stored[matterId]
        }
      }
      setTimers(hydrated)
    }

    void hydrateFromApi()

    const onStorage = (e: StorageEvent) => {
      if (e.key === "activeMatterTimers") hydrateFromStorage()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const hasRunning = Object.values(timers).some(t => t.isRunning)
    if (!hasRunning) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timers, tick])

  const headerTimer = headerTimerId ? timers[headerTimerId] : null
  const extraTimers = Object.values(timers).filter(t => t.matterId !== headerTimerId)
  const elapsedMs = headerTimer ? getElapsedMs(headerTimer) : 0
  const hms = msToHMS(elapsedMs)

  async function pauseAllExcept(activeMatterId: string) {
    const next = { ...useStopwatchStore.getState().timers }
    for (const id of Object.keys(next)) {
      if (id !== activeMatterId && next[id].isRunning) {
        if (!env.USE_STATIC_DATA) {
          await axiosClient.post("/api/activity/stopwatch", null, {
            params: { matterId: id, activityTimerStatus: "Pause" },
          }).catch(() => {})
        }
        next[id] = {
          ...next[id],
          isRunning: false,
          pause: true,
          pauseStartTime: Date.now(),
        }
      }
    }
    setTimers(next, activeMatterId)
  }

  async function handlePause(matterId: string) {
    try {
      let d: Record<string, unknown> | undefined
      if (!env.USE_STATIC_DATA) {
        const res = await axiosClient.post("/api/activity/stopwatch", null, {
          params: { matterId, activityTimerStatus: "Pause" },
        })
        if (res.data?.code === "403") {
          toast.error(res.data?.Msg ?? "Cannot pause timer")
          return
        }
        d = res.data?.data
      }
      const t = useStopwatchStore.getState().timers[matterId]
      if (!t) return
      upsertTimer({
        ...t,
        isRunning: false,
        pause: true,
        startTime: Number(d?.startTime ?? t.startTime),
        totalPauseTime: Number(d?.totalPauseTime ?? t.totalPauseTime ?? 0),
        pauseStartTime: Number(d?.pauseStartTime ?? Date.now()),
      })
    } catch {
      toast.error("Failed to pause timer")
    }
  }

  async function handleResume(matterId: string) {
    try {
      await pauseAllExcept(matterId)
      let d: Record<string, unknown> | undefined
      if (!env.USE_STATIC_DATA) {
        const res = await axiosClient.post("/api/activity/stopwatch", null, {
          params: { matterId, activityTimerStatus: "Resume" },
        })
        d = res.data?.data
      }
      const t = useStopwatchStore.getState().timers[matterId]
      if (!t) return
      upsertTimer({
        ...t,
        isRunning: true,
        pause: false,
        startTime: Number(d?.startTime ?? t.startTime),
        totalPauseTime: Number(d?.totalPauseTime ?? t.totalPauseTime ?? 0),
        pauseStartTime: null,
      })
      setHeaderTimerId(matterId)
    } catch {
      toast.error("Failed to resume timer")
    }
  }

  async function beginStop(matterId: string) {
    const t = useStopwatchStore.getState().timers[matterId]
    if (!t) return
    if (getElapsedMs(t) < 60_000) {
      toast.warning("Timer must run at least 1 minute before saving")
      return
    }
    setPopoverAnchor(null)
    setEndingMatterId(matterId)
    setEndDialogOpen(true)
  }

  async function handleEndSave() {
    if (!endingMatterId) return
    setIsLoading(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/activity/stopwatch", null, {
          params: { matterId: endingMatterId, activityTimerStatus: "End" },
        })
      }
      removeTimer(endingMatterId)
      setEndDialogOpen(false)
      setEndingMatterId(null)
    } catch {
      toast.error("Failed to end timer")
    } finally {
      setIsLoading(false)
    }
  }

  function handleEndDiscard() {
    if (endingMatterId) removeTimer(endingMatterId)
    setEndDialogOpen(false)
    setEndingMatterId(null)
  }

  if (!headerTimer && Object.keys(timers).length === 0) {
    return null
  }

  const ending = endingMatterId ? timers[endingMatterId] ?? headerTimer : headerTimer

  return (
    <>
      {isLoading && (
        <CircularProgress size={18} sx={{ mr: 1 }} />
      )}

      {headerTimer && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            mr: 0.5,
            maxWidth: 360,
          }}
        >
          <Box sx={{ minWidth: 0, pr: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Matter: {headerTimer.matterTitle}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
              Timer: {formatHMS(hms.hours, hms.minutes, hms.seconds)}
            </Typography>
          </Box>

          {headerTimer.isRunning ? (
            <Tooltip title="Pause">
              <IconButton size="small" onClick={() => handlePause(headerTimer.matterId)}>
                <PauseCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Resume">
              <IconButton size="small" onClick={() => handleResume(headerTimer.matterId)}>
                <PlayCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Add time entry">
            <span>
              <IconButton
                size="small"
                disabled={getElapsedMs(headerTimer) < 60_000}
                onClick={() => beginStop(headerTimer.matterId)}
              >
                <AddCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {extraTimers.length > 0 && (
            <Badge
              badgeContent={extraTimers.length}
              color="secondary"
              onClick={(e) => setPopoverAnchor(e.currentTarget as HTMLElement)}
              sx={{ cursor: "pointer", ml: 0.5 }}
            >
              <Typography variant="caption">More</Typography>
            </Badge>
          )}
        </Box>
      )}

      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          {extraTimers.map((t) => {
            const e = msToHMS(getElapsedMs(t))
            return (
              <Box key={t.matterId} sx={{ mb: 2, p: 1.5, borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Matter: {t.matterTitle}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  Timer: {formatHMS(e.hours, e.minutes, e.seconds)}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  {t.isRunning ? (
                    <IconButton size="small" onClick={() => handlePause(t.matterId)}>
                      <PauseCircleOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton size="small" onClick={() => handleResume(t.matterId)}>
                      <PlayCircleOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    disabled={getElapsedMs(t) < 60_000}
                    onClick={() => beginStop(t.matterId)}
                  >
                    <AddCircleOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Popover>

      <StopwatchEndDialog
        open={endDialogOpen}
        elapsed={ending ? Math.floor(getElapsedMs(ending) / 1000) : 0}
        matterId={ending?.matterId ?? null}
        matterTitle={ending?.matterTitle ?? null}
        onSave={handleEndSave}
        onDiscard={handleEndDiscard}
      />
    </>
  )
}
