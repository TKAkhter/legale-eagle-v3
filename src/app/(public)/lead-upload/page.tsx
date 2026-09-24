/**
 * Tokenized lead document upload — LMS `/lead/upload` (QR / mobile capture).
 * Uses query params: leadId, status, docType, _token. File upload (no webcam required).
 */
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

export default function LeadUploadPage() {
  const [params] = useSearchParams()
  const leadId = params.get("leadId") ?? ""
  const status = params.get("status") ?? ""
  const docType = params.get("docType") ?? ""
  const token = params.get("_token") ?? ""
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const missing = useMemo(() => {
    const gaps: string[] = []
    if (!leadId) gaps.push("leadId")
    if (!token) gaps.push("_token")
    return gaps
  }, [leadId, token])

  async function submit() {
    if (!files.length) { setError("Select at least one file"); return }
    if (missing.length) { setError(`Missing required params: ${missing.join(", ")}`); return }
    setUploading(true)
    setError("")
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 600))
        setDone(true)
        toast.success("Documents uploaded")
        return
      }
      const formData = new FormData()
      for (const f of files) formData.append("files", f)
      const base = env.API_BASE_URL?.replace(/\/$/, "") ?? ""
      const url = `${base}/api/leads/status/upload?leadId=${encodeURIComponent(leadId)}&status=${encodeURIComponent(status)}&note=note&docType=${encodeURIComponent(docType)}`
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { Msg?: string; message?: string }
        throw new Error(body.Msg ?? body.message ?? `Upload failed (${res.status})`)
      }
      setDone(true)
      toast.success("Documents uploaded")
      setFiles([])
    } catch (e: unknown) {
      setError((e as Error).message || "Upload failed. Rescan the QR code and try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2, bgcolor: "background.default" }}>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 480, width: "100%", borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Lead Document Upload</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload documents for this lead. Use the link from your QR code.
        </Typography>

        {missing.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This page expects a QR link with leadId and token. Missing: {missing.join(", ")}.
          </Alert>
        )}

        {done && <Alert severity="success" sx={{ mb: 2 }}>Upload complete. You can close this page.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={uploading}>
            Choose files
            <input
              hidden
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
            />
          </Button>
          {files.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {files.length} file(s): {files.map(f => f.name).join(", ")}
            </Typography>
          )}
          <Button
            variant="contained"
            disabled={uploading || !files.length || missing.length > 0}
            onClick={() => { void submit() }}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
