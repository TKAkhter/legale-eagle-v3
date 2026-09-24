import { useEffect, useState } from "react"
import { Box, Button, CircularProgress, TextField } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"

export default function MeetingTimePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("18:00")
  const [slotMinutes, setSlotMinutes] = useState("30")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await miscModulesApi.getMeetingTime() as Record<string, unknown>
        if (!cancelled && data) {
          if (data.startTime) setStartTime(String(data.startTime))
          if (data.endTime) setEndTime(String(data.endTime))
          if (data.slotMinutes != null) setSlotMinutes(String(data.slotMinutes))
        }
      } catch { /* keep defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    try {
      await miscModulesApi.saveMeetingTime({
        startTime,
        endTime,
        slotMinutes: Number(slotMinutes) || 30,
      })
      toast.success("Meeting time saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title="Meeting Time"
      description="Configure default meeting hours and slot length"
      breadcrumbs={[{ label: "Settings", path: "/admin/settings" }, { label: "Meeting Time" }]}
    >
      {loading ? <CircularProgress size={28} /> : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 420 }}>
          <TextField label="Start time" type="time" size="small" slotProps={{ inputLabel: { shrink: true } }} value={startTime} onChange={e => setStartTime(e.target.value)} />
          <TextField label="End time" type="time" size="small" slotProps={{ inputLabel: { shrink: true } }} value={endTime} onChange={e => setEndTime(e.target.value)} />
          <TextField label="Slot (minutes)" type="number" size="small" value={slotMinutes} onChange={e => setSlotMinutes(e.target.value)} />
          <Button variant="contained" disabled={saving} onClick={save}>Save</Button>
        </Box>
      )}
    </PageShell>
  )
}
