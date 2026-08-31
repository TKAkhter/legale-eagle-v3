/**
 * StopwatchEndDialog.tsx — shown when user clicks stop on the stopwatch.
 *
 * Displays elapsed time and prompts user to:
 *   - Save as a time entry (navigates to timelog form with prefilled values)
 *   - Discard (just stops the timer)
 *
 * In static mode: simulates save and shows toast.
 * In live mode: calls /api/activity/stopwatch with End status.
 */
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, CircularProgress,
} from "@mui/material"
import TimerIcon from "@mui/icons-material/Timer"
import CheckIcon from "@mui/icons-material/Check"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { formatElapsed } from "@lib/store/stopwatchStore"
import { toast } from "@/lib/toast"

interface Props {
  open:        boolean
  elapsed:     number
  matterId:    string | null
  matterTitle: string | null
  onSave:      () => Promise<void>
  onDiscard:   () => void
}

export function StopwatchEndDialog({ open, elapsed, matterId, matterTitle, onSave, onDiscard }: Props) {
  const navigate  = useNavigate()
  const [saving,  setSaving]  = useState(false)

  const hours   = elapsed / 3600
  const display = formatElapsed(elapsed)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave()
      toast.success(`Time logged: ${display} on ${matterTitle ?? "matter"}`)
      // Navigate to time-log-entries with prefilled matter
      if (matterId) navigate(`/time-log-entries?prefillMatterId=${matterId}`)
    } catch {
      toast.error("Failed to save time entry")
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    toast.info("Stopwatch discarded")
    onDiscard()
  }

  return (
    <Dialog
      open={open}
      onClose={handleDiscard}
      maxWidth="xs"
      fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 3 }}>
        <TimerIcon color="primary" />
        Session Complete
      </DialogTitle>
      <DialogContent>
        {/* Elapsed time display */}
        <Box sx={{
          textAlign: "center", py: 3,
          bgcolor: "action.hover", borderRadius: 2, mb: 2,
        }}>
          <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: "monospace", color: "primary.main" }}>
            {display}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hours.toFixed(2)} hours
          </Typography>
        </Box>

        {matterTitle && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Matter: <strong>{matterTitle}</strong>
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleDiscard} variant="outlined" color="error" disabled={saving}>
          Discard
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          sx={{ flex: 1 }}
        >
          {saving ? "Saving…" : "Save Time Entry"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
