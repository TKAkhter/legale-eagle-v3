/**
 * Create Document — TipTap editor + POST /api/document/add (documentType: Create).
 * Query: relatedTo | type, relatedToId | id, title? (OLD: /editor?id=&type=)
 */
import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField,
} from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

const RELATED_TYPES = ["MATTER", "HEARING", "LEAD", "CLIENT"] as const
type RelatedTo = (typeof RELATED_TYPES)[number]

interface DocTypeOpt {
  id: string
  name?: string
  type?: string
}

function parseRelatedTo(raw: string | null): RelatedTo | null {
  if (!raw) return null
  const upper = raw.trim().toUpperCase()
  return (RELATED_TYPES as readonly string[]).includes(upper) ? (upper as RelatedTo) : null
}

export default function CreateDocumentEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const relatedTo = useMemo(
    () => parseRelatedTo(searchParams.get("relatedTo") || searchParams.get("type")),
    [searchParams],
  )
  const relatedToId = useMemo(
    () => (searchParams.get("relatedToId") || searchParams.get("id") || "").trim(),
    [searchParams],
  )
  const titlePrefill = searchParams.get("title")?.trim() ?? ""

  const [title, setTitle] = useState(titlePrefill)
  const [docType, setDocType] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: docTypes = [] } = useQuery({
    queryKey: ["doc-types-list"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "dt1", name: "Agreement", type: "Agreement" }] as DocTypeOpt[]
      const r = await axiosClient.get("/api/util/list/doc/type")
      return (r.data?.data ?? r.data ?? []) as DocTypeOpt[]
    },
  })

  const paramsValid = !!relatedTo && !!relatedToId

  async function handleSave() {
    if (!paramsValid || !relatedTo) {
      toast.error("Missing relatedTo / relatedToId")
      return
    }
    if (!title.trim()) {
      toast.error("Document name is required")
      return
    }
    if (!docType) {
      toast.error("Document type is required")
      return
    }
    const html = content.trim()
    if (!html || html === "<p></p>") {
      toast.error("Document content is required")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        content: html,
        documentRelatedTo: relatedTo,
        documentRelatedToId: relatedToId,
        docType,
        documentType: "Create",
        uploadDocument: [] as unknown[],
      }
      if (!env.USE_STATIC_DATA) {
        const res = await axiosClient.post("/api/document/add", payload)
        const msg = res.data?.Msg ?? res.data?.message
        toast.success(typeof msg === "string" && msg ? msg : "Document created")
      } else {
        toast.success("Document created")
      }
      navigate(-1)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { Msg?: string; message?: string } }; message?: string }
      const msg = ax.response?.data?.Msg ?? ax.response?.data?.message ?? ax.message
      toast.error(typeof msg === "string" && msg ? msg : "Failed to save document")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title={t("nav.editor")}
      description={
        paramsValid
          ? t("pages.editorDesc")
          : "Provide relatedTo and relatedToId (or legacy type and id) query params"
      }
      breadcrumbs={[{ label: t("nav.editor") }]}
      action={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={saving || !paramsValid}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      }
    >
      {!paramsValid && (
        <Alert severity="warning">
          Open this page from an entity Documents tab, or pass{" "}
          <code>?relatedTo=MATTER&amp;relatedToId=…</code> (legacy: <code>?type=&amp;id=</code>).
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 960 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <TextField
            size="small"
            label="Document Name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            sx={{ minWidth: 220, flex: 1 }}
            disabled={!paramsValid}
          />
          <FormControl size="small" sx={{ minWidth: 220, flex: 1 }} disabled={!paramsValid}>
            <InputLabel>Document Type</InputLabel>
            <Select
              label="Document Type"
              value={docType}
              onChange={e => setDocType(String(e.target.value))}
            >
              {docTypes.map(d => (
                <MenuItem key={d.id} value={d.id}>{d.type ?? d.name ?? d.id}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <RichTextEditor
          value={content}
          onChange={setContent}
          minHeight={360}
          placeholder="Write the document…"
          readOnly={!paramsValid}
        />
      </Box>
    </PageShell>
  )
}
