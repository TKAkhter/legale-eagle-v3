/**
 * Complete an LFA fixed-fee breakdown item for a matter.
 * OLD: BreakdownDailog — select eligible LFA item, PATCH complete/breakdown.
 */
import { useEffect, useMemo, useState } from "react"
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  matter: Record<string, unknown>
}

function isEligible(item: Record<string, unknown>): boolean {
  return !item.invoiceCreated && !item.advance
}

function itemLabel(item: Record<string, unknown>): string {
  return String(
    item.name
    ?? item.title
    ?? item.breakdownName
    ?? (item.designation as { name?: string } | undefined)?.name
    ?? item.id
    ?? "—",
  )
}

export function MatterBreakdownDialog({ open, onClose, matterId, matter }: Props) {
  const qc = useQueryClient()
  const [breakDownId, setBreakDownId] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const itemsQuery = useQuery({
    queryKey: ["matters", "lfa-items", matterId],
    enabled: open && Boolean(matterId),
    queryFn: () => mattersApi.getLfaItemsForMatter(matter),
  })

  const eligible = useMemo(() => {
    const list = (itemsQuery.data ?? []) as Record<string, unknown>[]
    return list
      .filter(isEligible)
      .map(row => ({
        id: String(row.id ?? ""),
        name: itemLabel(row),
      }))
      .filter(row => row.id)
  }, [itemsQuery.data])

  useEffect(() => {
    if (!open) return
    setBreakDownId("")
    setError("")
  }, [open])

  async function submit() {
    if (!breakDownId) {
      setError("Select a breakdown item")
      return
    }
    setSaving(true)
    setError("")
    try {
      toast.success(await mattersApi.completeBreakdown(matterId, breakDownId))
      qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
      qc.invalidateQueries({ queryKey: ["matters", "lfa-items", matterId] })
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string }).message
        ?? "Failed to complete breakdown",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Complete Breakdown</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mark an LFA breakdown line as complete for this matter. Only items that have not been
          invoiced and are not advances are available.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {itemsQuery.isLoading ? (
          <CircularProgress size={28} />
        ) : eligible.length === 0 ? (
          <Alert severity="info">
            No eligible breakdown items. All LFA lines may already be invoiced or marked as advances.
          </Alert>
        ) : (
          <FormControl size="small" fullWidth required>
            <InputLabel>Breakdown item</InputLabel>
            <Select
              label="Breakdown item"
              value={breakDownId}
              onChange={e => setBreakDownId(String(e.target.value))}
            >
              {eligible.map(item => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => { void submit() }}
          disabled={saving || !breakDownId || eligible.length === 0}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
