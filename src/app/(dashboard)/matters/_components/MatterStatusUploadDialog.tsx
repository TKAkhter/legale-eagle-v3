/**
 * Matter status-document upload — LMS UploadDocuments.js / UploadDocs.js
 * POST /api/matter/status/upload?matterId=&status=&note= (multipart files)
 * Doc types from GET /api/util/list/doc/type (UI only in OLD; sent when selected).
 */
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import { leadsApi } from "@/api/leads"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  /** Timeline rows — OLD picks status options from timeline[].status */
  timeline?: Record<string, unknown>[]
  /** Prefill when opened from a specific timeline status */
  initialStatusId?: string
  onSuccess?: () => void
}

function extractTimelineStatuses(timeline: Record<string, unknown>[]): { id: string; statusName: string }[] {
  const seen = new Set<string>()
  const out: { id: string; statusName: string }[] = []
  for (const item of timeline) {
    const nested = item.status
    if (nested && typeof nested === "object") {
      const o = nested as { id?: string | number; statusName?: string; name?: string }
      const id = String(o.id ?? "")
      const statusName = String(o.statusName ?? o.name ?? id)
      if (id && !seen.has(id)) {
        seen.add(id)
        out.push({ id, statusName })
      }
      continue
    }
    const id = String(item.statusId ?? item.id ?? item.status ?? "")
    const statusName = String(
      item.statusName ?? item.currentStatus ?? item.name ?? item.status ?? id,
    )
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push({ id, statusName })
    }
  }
  return out
}

export function MatterStatusUploadDialog({
  open,
  onClose,
  matterId,
  timeline = [],
  initialStatusId = "",
  onSuccess,
}: Props) {
  const [status, setStatus] = useState("")
  const [docType, setDocType] = useState("")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const statusOptsQ = useQuery({
    queryKey: ["leads", "status-options"],
    enabled: open,
    queryFn: () => leadsApi.getLeadStatusOptions(),
  })

  const docTypesQ = useQuery({
    queryKey: ["util", "doc-types"],
    enabled: open,
    queryFn: () => mattersApi.getDocTypes(),
  })

  const timelineStatuses = useMemo(() => extractTimelineStatuses(timeline), [timeline])
  const statusOptions = timelineStatuses.length ? timelineStatuses : (statusOptsQ.data ?? [])

  useEffect(() => {
    if (!open) return
    setStatus(initialStatusId)
    setDocType("")
    setNote("")
    setFiles([])
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }, [open, initialStatusId])

  async function submit() {
    if (!status) { setError("Select status."); return }
    if (!files.length) { setError("Select at least one file."); return }
    setSaving(true)
    setError("")
    try {
      toast.success(await mattersApi.uploadStatusDoc({
        matterId,
        status,
        note: note.trim(),
        files,
        docType: docType || undefined,
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to upload documents",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Documents</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

        <FormControl size="small" fullWidth required>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {statusOptions.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.statusName.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>Document Type</InputLabel>
          <Select
            label="Document Type"
            value={docType}
            onChange={e => setDocType(String(e.target.value))}
          >
            {(docTypesQ.data ?? []).map(d => (
              <MenuItem key={String(d.id)} value={String(d.id)}>
                {d.type || d.name || d.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Note"
          value={note}
          onChange={e => setNote(e.target.value)}
          fullWidth
        />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Files *
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
