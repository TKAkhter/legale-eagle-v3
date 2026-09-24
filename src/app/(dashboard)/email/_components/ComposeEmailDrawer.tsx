import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { emailApi } from "@/api/email"

interface Props {
  open: boolean
  onClose: () => void
  replyTo?: { to?: string; subject?: string } | null
  onSuccess: () => void
}

export function ComposeEmailDrawer({ open, onClose, replyTo, onSuccess }: Props) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    setTo(replyTo?.to ?? "")
    setSubject(replyTo?.subject ? (replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`) : "")
    setBody("")
  }, [open, replyTo])

  async function submit() {
    const recipients = to.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    if (!recipients.length) { setError("Add at least one recipient"); return }
    if (!subject.trim()) { setError("Subject is required"); return }
    setSaving(true)
    setError("")
    try {
      await emailApi.send({ to: recipients, subject, body })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Failed to send email")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={replyTo ? "Reply" : "Compose Email"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Send"
      width={560}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="To" required value={to} onChange={e => setTo(e.target.value)} helperText="Comma-separated addresses" />
        <TextField size="small" label="Subject" required value={subject} onChange={e => setSubject(e.target.value)} />
        <TextField size="small" label="Body" multiline minRows={8} value={body} onChange={e => setBody(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
