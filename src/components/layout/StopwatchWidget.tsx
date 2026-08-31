/**
 * StopwatchWidget.tsx — live timer chip in the Toolbar.
 *
 * Shows when a stopwatch is running (started from matter detail "Log Time").
 * Hidden when idle.
 *
 * Controls:
 *   Pause  → pauses local tick + syncs with backend
 *   Resume → resumes
 *   Stop   → opens StopwatchEndDialog to save or discard
 */
import { useState, useEffect } from "react"
import { Box, Chip, Tooltip, IconButton } from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import PauseIcon     from "@mui/icons-material/Pause"
import StopIcon      from "@mui/icons-material/Stop"
import TimerIcon     from "@mui/icons-material/Timer"
import { useStopwatchStore, formatElapsed } from "@lib/store/stopwatchStore"
import { StopwatchEndDialog } from "./StopwatchEndDialog"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

export function StopwatchWidget() {
  const { status, elapsed, matterId, matterTitle, tick, pause, resume, end, start, setElapsed } = useStopwatchStore()
  const [endDialogOpen, setEndDialogOpen] = useState(false)

  // Sync with backend on mount (skip in static mode)
  useEffect(() => {
    if (env.USE_STATIC_DATA) return
    axiosClient.get("/api/activity/stopwatch/info")
      .then(r => {
        const info = r.data?.data ?? r.data
        if (info?.activityTimerStatus === "Start" || info?.activityTimerStatus === "Resume") {
          if (!info.matterId) return
          start(info.matterId, info.matterTitle ?? "", info.stopwatchId)
          setElapsed(info.elapsedSeconds ?? 0)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line

  // Local tick every second when running
  useEffect(() => {
    if (status !== "running") return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, tick])

  if (status === "idle") return null

  async function handlePause() {
    if (!env.USE_STATIC_DATA) await axiosClient.post("/api/activity/stopwatch", null, { params: { activityTimerStatus: "Pause", matterId } })
    pause()
  }

  async function handleResume() {
    if (!env.USE_STATIC_DATA) await axiosClient.post("/api/activity/stopwatch", null, { params: { activityTimerStatus: "Resume", matterId } })
    resume()
  }

  async function handleEndSave() {
    if (!env.USE_STATIC_DATA) await axiosClient.post("/api/activity/stopwatch", null, { params: { activityTimerStatus: "End", matterId } })
    end()
    setEndDialogOpen(false)
  }

  function handleEndDiscard() {
    end()
    setEndDialogOpen(false)
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Tooltip title={matterTitle ? `Timer: ${matterTitle}` : "Stopwatch"}>
          <Chip
            icon={<TimerIcon />}
            label={formatElapsed(elapsed)}
            size="small"
            color={status === "running" ? "primary" : "default"}
            sx={{ fontFamily: "monospace", fontWeight: 600 }}
          />
        </Tooltip>

        {status === "running" ? (
          <Tooltip title="Pause timer">
            <IconButton size="small" onClick={handlePause}>
              <PauseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Resume timer">
            <IconButton size="small" onClick={handleResume}>
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Stop and save">
          <IconButton size="small" color="error" onClick={() => setEndDialogOpen(true)}>
            <StopIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <StopwatchEndDialog
        open={endDialogOpen}
        elapsed={elapsed}
        matterId={matterId}
        matterTitle={matterTitle}
        onSave={handleEndSave}
        onDiscard={handleEndDiscard}
      />
    </>
  )
}
