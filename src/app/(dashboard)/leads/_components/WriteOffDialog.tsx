import { useEffect, useState } from "react"
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  onSuccess: () => void
}

export function WriteOffDialog({ open, onClose, leadId, onSuccess }: Props) {
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: reasons = [] } = useQuery({
    queryKey: ["leads", "write-off-reasons"],
    queryFn: () => leadsApi.getWriteOffReasons(),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setReasonId("")
      setNote("")
      setError("")
    }
  }, [open])

  async function submit() {
    if (!reasonId) {
      setError("Select a reason")
      return
    }
    setSaving(true)
    setError("")
    try {
      const reason = reasons.find(r => r.id === reasonId)?.name ?? reasonId
      await leadsApi.writeOff(leadId, note ? `${reason}: ${note}` : reason)
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Write-off failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Write Off Lead</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
          <InputLabel>Reason</InputLabel>
          <Select label="Reason" value={reasonId} onChange={e => setReasonId(e.target.value)}>
            {reasons.map(r => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Note (optional)"
          multiline
          minRows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" color="error" disabled={saving} onClick={submit}>Write Off</Button>
      </DialogActions>
    </Dialog>
  )
}
