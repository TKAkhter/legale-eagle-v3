/**
 * SendForSignatureDialog.tsx — send a Fee Agreement (LFA) for client signature.
 *
 * Shows a preview summary of the LFA, an email input pre-filled with the
 * client email, and a send button. Updates status to "Pending_Signature".
 *
 * Static mode: simulates send with 800ms delay, fires toast.success.
 * Live mode:   POST /api/lfa/send-for-signature
 */
import { useState } from "react"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, CircularProgress,
  Divider, Alert, Chip,
} from "@mui/material"
import SendIcon        from "@mui/icons-material/Send"
import DescriptionIcon from "@mui/icons-material/Description"
import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { toast }       from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"

interface Props {
  open:    boolean
  onClose: () => void
  lfa:     Record<string, unknown>
  onSent?: () => void
}

export function SendForSignatureDialog({ open, onClose, lfa, onSent }: Props) {
  const client     = lfa.client as Record<string, string> | null
  const clientName = client?.companyName || `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim()
  const [email,    setEmail]   = useState(client?.email ?? "")
  const [message,  setMessage] = useState(
    `Dear ${clientName},\n\nPlease find attached your Legal Fee Agreement (${String(lfa.agreementNo ?? "")}) for review and signature.\n\nKindly sign and return at your earliest convenience.\n\nRegards,\nLegalEagle LMS`
  )
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState("")

  async function handleSend() {
    if (!email.trim()) { setError("Recipient email is required"); return }
    setSending(true); setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/lfa/send-for-signature", {
          lfaId:   lfa.id,
          email:   email.trim(),
          message: message.trim(),
        })
      } else {
        await new Promise(r => setTimeout(r, 800))
      }
      toast.success(`Fee agreement sent to ${email.trim()}`)
      onSent?.()
      onClose()
    } catch {
      setError("Failed to send. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <DescriptionIcon sx={{ color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Send for Signature</Typography>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        {/* LFA summary */}
        <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, mb: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Agreement No.</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{String(lfa.agreementNo ?? "—")}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Client</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{clientName || "—"}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Type</Typography>
            <Chip label={String(lfa.billingType ?? "")} sx={{ height: 18, fontSize: 10 }} />
          </Box>
          {lfa.fixedBillingAmount != null && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatCurrency(Number(lfa.fixedBillingAmount as number ?? 0))}</Typography>
            </Box>
          )}
        </Box>

        {/* Email + message */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <TextField
            label="Recipient Email *"
            slotProps={{htmlInput:{type:"email"}}}
            fullWidth
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
          />
          <TextField
            label="Message"
            multiline
            rows={5}
            fullWidth
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? "Sending…" : "Send for Signature"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
