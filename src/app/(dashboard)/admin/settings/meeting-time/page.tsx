/**
 * Meeting Time — LMS per-day available slots (not a single global window).
 */
import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton,
  Paper, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

interface Slot { startTime: string; endTime: string }
interface DayRow {
  day: string
  available: boolean
  meetingTimes: Slot[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const DEFAULT_ROWS: DayRow[] = DAYS.map(day => ({
  day,
  available: false,
  meetingTimes: [{ startTime: "09:00", endTime: "10:00" }],
}))

function toHm(value: unknown): string {
  const s = String(value ?? "09:00")
  return s.length >= 5 ? s.slice(0, 5) : s
}

export default function MeetingTimePage() {
  const [rows, setRows] = useState<DayRow[]>(DEFAULT_ROWS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!env.USE_STATIC_DATA) {
          const r = await axiosClient.get("/api/user/get/meeting/time")
          const timings = (r.data?.data?.meetingTime ?? r.data?.meetingTime ?? []) as {
            day?: string; meetingTimes?: { startTime?: string; endTime?: string }[]
          }[]
          if (Array.isArray(timings) && timings.length && !cancelled) {
            setRows(prev => prev.map(row => {
              const match = timings.find(t => t.day === row.day)
              if (!match) return row
              const slots = (match.meetingTimes ?? []).map(m => ({
                startTime: toHm(m.startTime),
                endTime: toHm(m.endTime),
              }))
              return {
                ...row,
                available: true,
                meetingTimes: slots.length ? slots : row.meetingTimes,
              }
            }))
          }
        }
      } catch { /* defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  function updateDay(index: number, patch: Partial<DayRow>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function updateSlot(dayIndex: number, slotIndex: number, patch: Partial<Slot>) {
    setRows(prev => prev.map((r, i) => {
      if (i !== dayIndex) return r
      return {
        ...r,
        meetingTimes: r.meetingTimes.map((s, j) => (j === slotIndex ? { ...s, ...patch } : s)),
      }
    }))
  }

  async function save() {
    setSaving(true)
    try {
      const meetingTimeInfo = rows
        .filter(r => r.available)
        .map(r => ({
          day: r.day,
          meetingTimes: r.meetingTimes.map(s => ({
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }))
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/user/meeting/time/setup", { meetingTimeInfo })
      }
      toast.success("Meeting time saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <PageShell
      title="Meeting Time"
      description="Configure available meeting hours per day"
      breadcrumbs={[{ label: "Settings", path: "/admin/settings" }, { label: "Meeting Time" }]}
      action={
        <Button component={RouterLink} to="/admin/settings" size="small" startIcon={<ArrowBackIcon />} variant="outlined">
          All settings
        </Button>
      }
    >
      {loading ? <CircularProgress size={28} /> : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 800, width: "100%" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {rows.map((row, dayIndex) => (
              <Box key={row.day} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={row.available}
                      onChange={(_, v) => updateDay(dayIndex, { available: v })}
                    />
                  }
                  label={<Typography sx={{ fontWeight: 600 }}>{row.day}</Typography>}
                />
                {row.available && (
                  <Box sx={{ pl: 4, display: "flex", flexDirection: "column", gap: 1 }}>
                    {row.meetingTimes.map((slot, slotIndex) => (
                      <Box key={slotIndex} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <TextField
                          size="small" type="time" label="Start"
                          value={slot.startTime}
                          onChange={e => updateSlot(dayIndex, slotIndex, { startTime: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          size="small" type="time" label="End"
                          value={slot.endTime}
                          onChange={e => updateSlot(dayIndex, slotIndex, { endTime: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <IconButton
                          size="small"
                          disabled={row.meetingTimes.length <= 1}
                          onClick={() => updateDay(dayIndex, {
                            meetingTimes: row.meetingTimes.filter((_, j) => j !== slotIndex),
                          })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small" startIcon={<AddIcon />}
                      onClick={() => updateDay(dayIndex, {
                        meetingTimes: [...row.meetingTimes, { startTime: "09:00", endTime: "10:00" }],
                      })}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Add slot
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
            <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start" }}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Box>
        </Paper>
      )}
    </PageShell>
  )
}
