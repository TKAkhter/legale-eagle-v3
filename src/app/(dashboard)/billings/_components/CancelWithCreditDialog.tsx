/**
 * Cancel invoice with Credit Note or Refund — LMS CancelWithCreditInvoice
 * PUT /invoice/cancel/{id}/{true|false}.
 */
import { useEffect, useState } from "react"
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, InputLabel, MenuItem, Select,
} from "@mui/material"
import { billingApi } from "@/api/billing"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  invoiceId: string
  onDone?: () => void
}

export function CancelWithCreditDialog({ open, onClose, invoiceId, onDone }: Props) {
  const [mode, setMode] = useState<"true" | "false" | "">("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode("")
    setError("")
  }, [open, invoiceId])

  async function submit() {
    if (!mode) {
      setError("Select Credit Note or Refund")
      return
    }
    setSaving(true)
    setError("")
    try {
      toast.success(await billingApi.cancelWithCredit(invoiceId, mode === "true"))
      onDone?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to cancel invoice",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cancel Invoice</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth required>
          <InputLabel>Settlement</InputLabel>
          <Select
            label="Settlement"
            value={mode}
            onChange={e => setMode(e.target.value as "true" | "false" | "")}
          >
            <MenuItem value="true">Credit Note</MenuItem>
            <MenuItem value="false">Refund</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>No</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => { void submit() }}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Cancel Invoice
        </Button>
      </DialogActions>
    </Dialog>
  )
}
