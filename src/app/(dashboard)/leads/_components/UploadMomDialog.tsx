/**
 * Meeting MOM upload — LMS UploadMOM.js
 * POST /api/meeting/mom/upload?meetingId=&content= (multipart files)
 */
import { useEffect, useRef, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography,
} from "@mui/material"
import { leadsApi } from "@/api/leads"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  meetingId: string
  onSuccess?: () => void
}

export function UploadMomDialog({ open, onClose, meetingId, onSuccess }: Props) {
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setContent("")
    setDescription("")
    setFiles([])
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }, [open])

  async function submit() {
    if (!content.trim()) { setError("Title is required"); return }
    if (!meetingId) { setError("Missing meeting"); return }
    setSaving(true)
    setError("")
    try {
      // OLD only sends content + files (description is UI-only / unused by API)
      toast.success(await leadsApi.uploadMeetingMom(meetingId, content.trim(), files))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to upload MOM",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload MOM</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <TextField
          size="small"
          label="Title"
          required
          value={content}
          onChange={e => setContent(e.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="Description"
          multiline
          minRows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          fullWidth
        />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Files
          </Typography>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,application/doc,.doc,.docx"
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {files.length} file(s): {files.map(f => f.name).join(", ")}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={() => { void submit() }}>
          {saving ? "Uploading…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
