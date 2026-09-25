import { useEffect, useRef, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { clientsApi } from "@/api/clients"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
}

export function UploadAdminDocumentDrawer({ open, onClose, clientId, onSuccess }: Props) {
  const [docType, setDocType] = useState("")
  const [fileLabel, setFileLabel] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const { data: docTypes = [] } = useQuery({
    queryKey: ["util", "doc-types"],
    enabled: open,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "license", type: "License" }, { id: "id", type: "ID" }]
      }
      const res = await axiosClient.get("/api/util/list/doc/type")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (open) {
      setDocType("")
      setFile(null)
      setFileLabel("")
      setError("")
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [open])

  async function submit() {
    if (!docType) {
      setError("Select a document type")
      return
    }
    if (!file) {
      setError("Select a file to upload")
      return
    }
    setSaving(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("docType", docType)
      await clientsApi.uploadAdminDocument(clientId, formData)
      onSuccess()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
          ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (e as { message?: string }).message
          ?? "Failed to upload document",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Upload Admin Document"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Upload"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl size="small" fullWidth required>
          <InputLabel>Document Type</InputLabel>
          <Select label="Document Type" value={docType} onChange={e => setDocType(String(e.target.value))}>
            {(docTypes as { id: string; type?: string; name?: string }[]).map(d => (
              <MenuItem key={d.id} value={d.id}>{d.type || d.name || d.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            File
          </Typography>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx"
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              setFileLabel(f?.name ?? "")
            }}
          />
          {fileLabel && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {fileLabel}
            </Typography>
          )}
        </Box>
      </Box>
    </FormDrawer>
  )
}
