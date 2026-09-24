/**
 * Send invoice by email — LMS SendEmailInvoice (POST /invoice/send/email + emails[]).
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, OutlinedInput,
  Select, TextField, Typography,
} from "@mui/material"
import { billingApi } from "@/api/billing"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  invoiceId: string
  /** Suggested recipient emails (client / finance contacts). */
  suggestedEmails?: string[]
  onSent?: () => void
}

export function InvoiceSendEmailDialog({
  open, onClose, invoiceId, suggestedEmails = [], onSent,
}: Props) {
  const [emails, setEmails] = useState<string[]>([])
  const [custom, setCustom] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmails(suggestedEmails.filter(Boolean))
    setCustom("")
    setError("")
  }, [open, invoiceId, suggestedEmails])

  function addCustom() {
    const v = custom.trim()
    if (!v || !v.includes("@")) {
      setError("Enter a valid email")
      return
    }
    if (!emails.includes(v)) setEmails(prev => [...prev, v])
    setCustom("")
    setError("")
  }

  async function submit() {
    if (!emails.length) {
      setError("Select or add at least one email")
      return
    }
    setSaving(true)
    setError("")
    try {
      toast.success(await billingApi.sendEmail(invoiceId, emails))
      onSent?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to send email",
      )
    } finally {
      setSaving(false)
    }
  }

  const options = Array.from(new Set([...suggestedEmails, ...emails].filter(Boolean)))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Send Invoice Email</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>Emails</InputLabel>
          <Select
            multiple
            label="Emails"
            value={emails}
            onChange={e => setEmails(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
            input={<OutlinedInput label="Emails" />}
            renderValue={selected => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {(selected as string[]).map(v => <Chip key={v} label={v} size="small" />)}
              </Box>
            )}
          >
            {options.map(e => (
              <MenuItem key={e} value={e}>{e}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="Add email"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom() } }}
          />
          <Button size="small" variant="outlined" onClick={addCustom}>Add</Button>
        </Box>
        {!suggestedEmails.length && (
          <Typography variant="caption" color="text.secondary">
            No client emails on file — add recipients manually.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => { void submit() }}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  )
}
