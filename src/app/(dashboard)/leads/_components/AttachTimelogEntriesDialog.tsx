/**
 * Attach selected time-log activities to a client matter.
 * OLD: LMS-Web AttachActivities(V2).js → POST /activity/attach/to/matter/v2
 * Used from lead detail (after convert) and client Time Logs tab.
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel, FormHelperText,
  InputLabel, MenuItem, Select, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  activityIds: string[]
  onSuccess: () => void
}

export function AttachTimelogEntriesDialog({
  open, onClose, clientId, activityIds, onSuccess,
}: Props) {
  const [matterId, setMatterId] = useState("")
  const [billable, setBillable] = useState(true)
  const [revenueAllocated, setRevenueAllocated] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: matters = [], isLoading, isError } = useQuery({
    queryKey: ["matters", "long-by-client", clientId],
    queryFn: () => mattersApi.listLongMattersByClient(clientId),
    enabled: open && !!clientId,
  })

  const selectedMatter = matters.find(m => m.id === matterId)

  useEffect(() => {
    if (!open) return
    setMatterId("")
    setBillable(true)
    setRevenueAllocated(true)
    setError("")
  }, [open])

  useEffect(() => {
    if (!selectedMatter) return
    if (selectedMatter.billingType === "Hourly") {
      setBillable(true)
      setRevenueAllocated(false)
    } else if (selectedMatter.billingType === "Fixed") {
      setRevenueAllocated(true)
      setBillable(false)
    }
  }, [selectedMatter?.id, selectedMatter?.billingType])

  async function submit() {
    if (!matterId) {
      setError("Select a matter")
      return
    }
    if (!activityIds.length) {
      setError("Select at least one time log entry")
      return
    }
    setSaving(true)
    setError("")
    try {
      const msg = await leadsApi.attachActivitiesToMatter({
        matterId,
        activities: activityIds,
        billable,
        revenueAllocated,
      })
      toast.success(msg)
      onSuccess()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { Msg?: string; message?: string } } })
        ?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as Error)?.message
        ?? "Failed to attach time log entries"
      setError(String(msg))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Attach Time Log Entries</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Attach {activityIds.length} selected {activityIds.length === 1 ? "entry" : "entries"} to a matter.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!clientId && (
          <Alert severity="warning">This lead has no linked client. Convert the lead first.</Alert>
        )}
        {isError && <Alert severity="error">Could not load matters for this client.</Alert>}
        <FormControl size="small" fullWidth sx={{ mt: 0.5 }} disabled={!clientId || isLoading || saving}>
          <InputLabel id="attach-timelog-matter">Matters</InputLabel>
          <Select
            labelId="attach-timelog-matter"
            label="Matters"
            value={matterId}
            onChange={e => setMatterId(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {matters.map(m => (
              <MenuItem key={m.id} value={m.id}>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 2 }}>
                  <span>{m.title}</span>
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {m.billingType}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {isLoading && <FormHelperText>Loading matters…</FormHelperText>}
          {!isLoading && clientId && matters.length === 0 && (
            <FormHelperText>No open long matters for this client.</FormHelperText>
          )}
        </FormControl>

        {selectedMatter?.billingType === "Hourly" && (
          <FormControlLabel
            control={
              <Checkbox
                checked={billable}
                onChange={e => setBillable(e.target.checked)}
                disabled={saving}
              />
            }
            label="Billable"
          />
        )}
        {selectedMatter?.billingType === "Fixed" && (
          <FormControlLabel
            control={
              <Checkbox
                checked={revenueAllocated}
                onChange={e => setRevenueAllocated(e.target.checked)}
                disabled={saving}
              />
            }
            label="Revenue Allocated"
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        {saving ? (
          <CircularProgress size={24} sx={{ mr: 1 }} />
        ) : (
          <Button
            variant="contained"
            disabled={!matterId || !activityIds.length || !clientId}
            onClick={() => void submit()}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
