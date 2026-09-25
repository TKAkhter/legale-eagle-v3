/**
 * Lead status-document upload — LMS UploadDocuments.js
 * POST /api/leads/status/upload?leadId=&status=&note=&docType= (multipart files)
 * Optional QR via POST /api/qrcode/generateQRCode → public /lead/upload
 */
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import { useAuthStore } from "@lib/store/authStore"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  /** Timeline rows — OLD picks status options from timeline[].status */
  timeline?: Record<string, unknown>[]
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
      item.statusName ?? item.currentStatus ?? item.leadStatus ?? item.name ?? item.status ?? id,
    )
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push({ id, statusName })
    }
  }
  return out
}

export function LeadStatusUploadDialog({
  open,
  onClose,
  leadId,
  timeline = [],
  onSuccess,
}: Props) {
  const accessToken = useAuthStore(s => s.accessToken)
  const [status, setStatus] = useState("")
  const [docType, setDocType] = useState("")
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [qrBase64, setQrBase64] = useState("")
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
    queryFn: () => leadsApi.getDocTypes(),
  })

  const timelineStatuses = useMemo(() => extractTimelineStatuses(timeline), [timeline])
  const statusOptions = timelineStatuses.length ? timelineStatuses : (statusOptsQ.data ?? [])

  useEffect(() => {
    if (!open) return
    setStatus("")
    setDocType("")
    setNote("")
    setFiles([])
    setQrBase64("")
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }, [open])

  async function refreshQR(nextStatus: string, nextDocType: string) {
    setQrBase64("")
    if (!nextDocType || !nextStatus || !leadId) return
    const token = accessToken ?? ""
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const codeText =
      `${origin}/lead/upload?status=${encodeURIComponent(nextStatus)}`
      + `&leadId=${encodeURIComponent(leadId)}`
      + `&docType=${encodeURIComponent(nextDocType)}`
      + `&_token=${encodeURIComponent(token)}`
    try {
      const img = await leadsApi.generateQRCode(codeText)
      if (img) setQrBase64(img)
    } catch {
      // QR is optional — upload still works without it
    }
  }

  async function submit() {
    if (!status) { setError("Select status."); return }
    if (!docType) { setError("Select documents type."); return }
    if (!files.length) { setError("Select at least one file."); return }
    setSaving(true)
    setError("")
    try {
      toast.success(await leadsApi.uploadStatusDoc({
        leadId,
        status,
        docType,
        note: note.trim(),
        files,
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
            onChange={e => {
              const next = e.target.value
              setStatus(next)
              if (docType) void refreshQR(next, docType)
              else setQrBase64("")
            }}
          >
            {statusOptions.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.statusName.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth required>
          <InputLabel>Document Type</InputLabel>
          <Select
            label="Document Type"
            value={docType}
            onChange={e => {
              const next = String(e.target.value)
              setDocType(next)
              void refreshQR(status, next)
            }}
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

        {qrBase64 && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Scan to upload from mobile
            </Typography>
            <Box
              component="img"
              src={`data:image/png;base64,${qrBase64}`}
              alt="Upload QR code"
              sx={{ maxWidth: 200, height: "auto" }}
            />
          </Box>
        )}
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
