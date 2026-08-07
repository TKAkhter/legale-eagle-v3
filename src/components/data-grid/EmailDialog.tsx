/**
 * EmailDialog.tsx — send DataGrid data by email.
 *
 * Shows when hasEmail=true and the user clicks the email toolbar button.
 * Supports multiple recipients (comma-separated or individual chips).
 * Subject and body are pre-filled but editable before sending.
 */
import { useState } from "react"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Chip, Typography, CircularProgress, Alert,
} from "@mui/material"
import EmailIcon from "@mui/icons-material/Email"
import type { EmailConfig } from "./types"

interface Props {
  open:        boolean
  onClose:     () => void
  config:      EmailConfig
  /** Context for pre-filling subject/body (e.g. current filter summary) */
  context?:    Record<string, string>
}

export function EmailDialog({ open, onClose, config, context = {} }: Props) {
  const [recipients, setRecipients] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [subject,    setSubject]    = useState(config.defaultSubject ?? "")
  const [body,       setBody]       = useState(config.defaultBody ?? "")
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState("")
  const [sent,       setSent]       = useState(false)

  function addRecipient(email: string) {
    const trimmed = email.trim()
    if (!trimmed || recipients.includes(trimmed)) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(`"${trimmed}" is not a valid email address`)
      return
    }
    setRecipients(prev => [...prev, trimmed])
    setInputValue("")
    setError("")
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addRecipient(inputValue)
    }
  }

  async function handleSend() {
    if (!recipients.length) { setError("Add at least one recipient"); return }
    setLoading(true)
    setError("")
    try {
      await config.onSend({ to: recipients, subject, body })
      setSent(true)
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to send email")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    // Reset state when closing
    setRecipients([])
    setInputValue("")
    setSubject(config.defaultSubject ?? "")
    setBody(config.defaultBody ?? "")
    setError("")
    setSent(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 3 }}>
        <EmailIcon color="primary" />
        Send by Email
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {sent ? (
          <Alert severity="success">Email sent successfully to {recipients.join(", ")}</Alert>
        ) : (
          <>
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

            {/* Recipients input with chips */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                To (press Enter or comma to add)
              </Typography>
              <Box sx={{
                display: "flex", flexWrap: "wrap", gap: 0.5, p: 1,
                border: "1px solid", borderColor: "divider", borderRadius: 1,
                minHeight: 44,
              }}>
                {recipients.map(r => (
                  <Chip
                    key={r}
                    label={r}
                    size="small"
                    onDelete={() => setRecipients(prev => prev.filter(x => x !== r))}
                  />
                ))}
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={() => inputValue && addRecipient(inputValue)}
                  placeholder={recipients.length ? "" : "Enter email address..."}
                  style={{
                    border: "none", outline: "none", flex: 1, minWidth: 180,
                    fontSize: 14, background: "transparent", color: "inherit",
                  }}
                />
              </Box>
            </Box>

            <TextField
              label="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              size="small"
              fullWidth
            />

            <TextField
              label="Message"
              value={body}
              onChange={e => setBody(e.target.value)}
              multiline
              rows={4}
              fullWidth
              size="small"
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          {sent ? "Close" : "Cancel"}
        </Button>
        {!sent && (
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={loading || !recipients.length}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />}
          >
            {loading ? "Sending…" : "Send"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
