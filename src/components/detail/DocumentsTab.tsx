/**
 * Documents tab — LMS document list/upload/request for Matter, Client, Lead.
 * OneDrive deep-link kept as secondary action.
 */
import { useMemo, useRef, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, InputLabel, Link, MenuItem, Select, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import RequestPageIcon from "@mui/icons-material/RequestPage"
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

interface DocFile {
  id?: string
  document?: string
  fileName?: string
  url?: string
  name?: string
}

interface DocumentRow {
  id: string
  title?: string
  documentType?: string
  uploadDocument?: DocFile[]
  updatedAt?: string
  createdAt?: string
  docType?: string
}

interface DocTypeOpt {
  id: string
  name?: string
  type?: string
}

function formatWhen(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export function DocumentsTab({
  relatedTo,
  relatedToId,
  label,
}: {
  relatedTo: "MATTER" | "CLIENT" | "LEAD" | "HEARING"
  relatedToId: string
  label?: string
}) {
  const qc = useQueryClient()
  const queryKey = useMemo(
    () => ["entity-documents", relatedTo, relatedToId] as const,
    [relatedTo, relatedToId],
  )
  const onedriveHref = `/integrations/onedrive?relatedTo=${relatedTo}&relatedToId=${encodeURIComponent(relatedToId)}`
  const createHref = `/editor?relatedTo=${relatedTo}&relatedToId=${encodeURIComponent(relatedToId)}`

  const [uploadOpen, setUploadOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [docType, setDocType] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    enabled: !!relatedToId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          {
            id: "doc1",
            title: "Retainer",
            documentType: "Upload",
            updatedAt: new Date().toISOString(),
            uploadDocument: [{ id: "f1", fileName: "retainer.pdf", document: "#" }],
          },
          {
            id: "doc2",
            title: "ID copy",
            documentType: "Requested",
            updatedAt: new Date().toISOString(),
            uploadDocument: [],
          },
        ] as DocumentRow[]
      }
      const r = await axiosClient.post("/api/document/get/type", null, {
        params: { documentRelatedTo: relatedTo, documentRelatedToId: relatedToId },
      })
      const data = r.data?.data ?? r.data ?? []
      return Array.isArray(data) ? (data as DocumentRow[]) : []
    },
  })

  const { data: docTypes = [] } = useQuery({
    queryKey: ["doc-types-list"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "dt1", name: "Agreement", type: "Agreement" }] as DocTypeOpt[]
      const r = await axiosClient.get("/api/util/list/doc/type")
      return (r.data?.data ?? r.data ?? []) as DocTypeOpt[]
    },
  })

  function resetForm() {
    setTitle("")
    setDocType("")
    if (fileRef.current) fileRef.current.value = ""
  }

  async function uploadFiles(): Promise<unknown[]> {
    const files = fileRef.current?.files
    if (!files?.length) return []
    setUploading(true)
    try {
      if (env.USE_STATIC_DATA) {
        return Array.from(files).map((f, i) => ({
          id: `f-${i}`,
          fileName: f.name,
          document: "#",
        }))
      }
      const formData = new FormData()
      formData.append("folderName", `${relatedTo}/documents`)
      formData.append("uuid", relatedToId)
      for (let i = 0; i < files.length; i++) formData.append("file", files.item(i)!)
      const res = await axiosClient.post("/api/util/fileUpload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const data = res.data?.data ?? res.data
      return Array.isArray(data) ? data : [data].filter(Boolean)
    } finally {
      setUploading(false)
    }
  }

  async function saveUpload() {
    if (!title.trim() || !docType) {
      toast.error("Title and document type are required")
      return
    }
    if (!fileRef.current?.files?.length) {
      toast.error("Select at least one file")
      return
    }
    setSaving(true)
    try {
      const uploadDocument = await uploadFiles()
      const payload = {
        documentRelatedTo: relatedTo,
        documentRelatedToId: relatedToId,
        documentType: "Upload",
        docType,
        title: title.trim(),
        uploadDocument,
      }
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/document/add", payload)
      toast.success("Document uploaded")
      setUploadOpen(false)
      resetForm()
      qc.invalidateQueries({ queryKey })
    } catch { toast.error("Failed to upload document") }
    finally { setSaving(false) }
  }

  async function saveRequest() {
    if (!title.trim() || !docType) {
      toast.error("Title and document type are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        documentRelatedTo: relatedTo,
        documentRelatedToId: relatedToId,
        documentType: "Requested",
        docType,
        title: title.trim(),
        uploadDocument: [],
      }
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/document/add", payload)
      toast.success("Document requested")
      setRequestOpen(false)
      resetForm()
      qc.invalidateQueries({ queryKey })
    } catch { toast.error("Failed to request document") }
    finally { setSaving(false) }
  }

  async function openPdf(documentId: string) {
    try {
      if (env.USE_STATIC_DATA) {
        window.open("#", "_blank")
        return
      }
      const r = await axiosClient.get("/api/document/convert/pdf", { params: { documentId } })
      const url = r.data?.data ?? r.data
      if (typeof url === "string" && url) window.open(url, "_blank")
      else toast.error("No PDF URL returned")
    } catch { toast.error("Failed to open PDF") }
  }

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, justifyContent: "space-between" }}>
        <Alert severity="info" icon={<CloudOutlinedIcon />} sx={{ flex: 1, minWidth: 240 }}>
          LMS documents for this {label ?? relatedTo.toLowerCase()}. OneDrive remains available for folder browse.
        </Alert>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            component={RouterLink}
            to={createHref}
            variant="contained"
            startIcon={<NoteAddOutlinedIcon />}
          >
            Create Document
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => { resetForm(); setUploadOpen(true) }}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<RequestPageIcon />}
            onClick={() => { resetForm(); setRequestOpen(true) }}
          >
            Request
          </Button>
          <Button component={RouterLink} to={onedriveHref} variant="text" startIcon={<CloudOutlinedIcon />}>
            OneDrive
          </Button>
        </Box>
      </Box>

      {isLoading ? <CircularProgress size={28} /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Download</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id} hover>
                <TableCell>{row.title ?? "—"}</TableCell>
                <TableCell>{row.documentType ?? "—"}</TableCell>
                <TableCell>
                  {row.documentType === "Create" && (
                    <Button size="small" variant="outlined" onClick={() => void openPdf(row.id)}>PDF</Button>
                  )}
                  {row.documentType === "Upload" && (row.uploadDocument ?? []).map((u, i) => {
                    const href = u.document ?? u.url ?? "#"
                    const name = u.fileName ?? u.name ?? "Download"
                    return (
                      <Typography key={u.id ?? i} component="div" variant="body2">
                        <Link href={href} target="_blank" rel="noopener noreferrer" download>
                          {name}
                        </Link>
                      </Typography>
                    )
                  })}
                  {row.documentType === "Requested" && (
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                  )}
                </TableCell>
                <TableCell>{formatWhen(row.updatedAt ?? row.createdAt)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">There are no documents.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField size="small" label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <FormControl size="small" fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select label="Document Type" value={docType} onChange={e => setDocType(String(e.target.value))}>
                {docTypes.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.type ?? d.name ?? d.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" component="label" disabled={uploading}>
              {uploading ? "Uploading…" : "Choose files"}
              <input ref={fileRef} hidden type="file" multiple accept="image/*,application/pdf,.doc,.docx" />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveUpload} disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Documents</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField size="small" label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <FormControl size="small" fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select label="Document Type" value={docType} onChange={e => setDocType(String(e.target.value))}>
                {docTypes.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.type ?? d.name ?? d.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRequest} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
