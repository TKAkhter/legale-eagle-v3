import { useEffect, useState } from "react"
import {
  Alert, Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { mattersApi } from "@/api/matters"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  current?: { enabled?: boolean; reasonId?: string } | null
  onSuccess: () => void
}

export function StopWorkingDrawer({ open, onClose, matterId, current, onSuccess }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [reasonId, setReasonId] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const reasonsQuery = useQuery({
    queryKey: ["matters", "stop-working-reasons"],
    enabled: open,
    queryFn: () => mattersApi.getStopWorkingReasons(),
  })

  useEffect(() => {
    if (!open) return
    setEnabled(!!current?.enabled)
    setReasonId(current?.reasonId ?? "")
    setSendEmail(false)
    setError("")
  }, [open, current])

  async function submit() {
    if (enabled && !reasonId) { setError("Select a reason"); return }
    setSaving(true)
    setError("")
    try {
      await mattersApi.updateStopWorking(matterId, {
        stopWorkingEnabled: enabled,
        stopWorkingReasonId: reasonId || undefined,
        sendEmail,
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to update stop working")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={current?.enabled ? "Edit Stop Working" : "Mark Stop Working"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Save"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />}
          label="Stop working on this matter"
        />
        <FormControl size="small" fullWidth disabled={!enabled}>
          <InputLabel>Reason</InputLabel>
          <Select label="Reason" value={reasonId} onChange={e => setReasonId(e.target.value)}>
            {(reasonsQuery.data ?? []).map(r => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Checkbox checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} disabled={!enabled} />}
          label="Notify team by email"
        />
      </Box>
    </FormDrawer>
  )
}
