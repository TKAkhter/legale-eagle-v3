import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { leadsApi } from "@/api/leads"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  onSuccess: () => void
}

export function MeetingFormDrawer({ open, onClose, leadId, onSuccess }: Props) {
  const [title, setTitle] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setMeetingDate("")
    setLocation("")
    setNotes("")
    setError("")
  }, [open])

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!meetingDate) { setError("Date/time is required"); return }
    setSaving(true)
    setError("")
    try {
      await leadsApi.createMeeting(leadId, {
        title,
        meetingTitle: title,
        meetingDate,
        meetingStartTime: meetingDate,
        location,
        notes,
        leadId,
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to schedule meeting")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Schedule Meeting"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Schedule"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField
          size="small"
          label="Date & Time"
          type="datetime-local"
          required
          value={meetingDate}
          onChange={e => setMeetingDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField size="small" label="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <TextField size="small" label="Notes" multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
