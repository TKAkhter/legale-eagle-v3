/**
 * Short-matter close — LMS short-matter CloseMatter: note + closeDate only.
 */
import { useEffect, useState } from "react"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  matterTitle?: string
  onClosed?: () => void
}

export function ShortMatterCloseDialog({
  open,
  onClose,
  matterId,
  matterTitle,
  onClosed,
}: Props) {
  const qc = useQueryClient()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState("")
  const [closeDate, setCloseDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!open) return
    setError("")
    setNote("")
    setCloseDate(new Date().toISOString().slice(0, 10))
  }, [open, matterId])

  async function submit() {
    if (!note.trim()) { setError("Notes are required"); return }
    if (!closeDate) { setError("Close date is required"); return }
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/matter/close", { note: note.trim(), closeDate }, {
          params: { matterId },
        })
      }
      qc.invalidateQueries({ queryKey: ["matters", "short"] })
      toast.success("Short matter closed")
      onClosed?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to close short matter",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Close Short Matter{matterTitle ? `: ${matterTitle}` : ""}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          size="small"
          label="Close Date"
          type="date"
          required
          value={closeDate}
          onChange={e => setCloseDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          size="small"
          label="Notes"
          required
          multiline
          minRows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => { void submit() }}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Close Matter
        </Button>
      </DialogActions>
    </Dialog>
  )
}
