/**
 * Conflict Check — LMS `/check-conflict` behavioral parity.
 * Payload must match OLD flat shape (not conflictCheckDTOList).
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import type { ColumnDef } from "@/components/data-grid/types"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

interface ConflictForm {
  firstName: string
  companyName: string
  phone: string
  email: string
  partyOpposing: string
  compareDoc: string
}

interface ConflictMatchRow extends Record<string, unknown> {
  id: string
  title: string
  practiceArea: string
  lawyers: string
  clientName: string
  comparePercentage: number
  clientEmail: string
  clientPhone: string
  description: string
  conflictCause: string
  matterId?: string
  leadId?: string
}

interface ConflictSummary {
  name?: string
  conflictStatus?: string
  matchType?: string
  details?: string
  aiSummary?: string
  existingClient?: boolean
  existingLead?: boolean
  existingMatter?: string
}

interface ConflictCheckResponse {
  summary: ConflictSummary[]
  clients: ConflictMatchRow[]
  leads: ConflictMatchRow[]
}

const EMPTY: ConflictForm = {
  firstName: "",
  companyName: "",
  phone: "",
  email: "",
  partyOpposing: "",
  compareDoc: "",
}

function pageOf<T extends Record<string, unknown>>(rows: T[]): PageResponse<T> {
  return {
    content: rows,
    totalElements: rows.length,
    totalPages: 1,
    number: 0,
    size: rows.length || 25,
    first: true,
    last: true,
    empty: rows.length === 0,
  }
}

function mapMatch(raw: Record<string, unknown>, i: number, kind: "client" | "lead"): ConflictMatchRow {
  const matterId = raw.matterId != null ? String(raw.matterId) : undefined
  const leadId = raw.leadId != null ? String(raw.leadId ?? raw.id) : (kind === "lead" ? String(raw.id ?? "") : undefined)
  const clientType = String(raw.clientType ?? "")
  const clientName = clientType === "PERSON"
    ? String(raw.clientName ?? raw.name ?? "—")
    : String(raw.companyName ?? raw.clientName ?? raw.name ?? "—")
  return {
    id: String(raw.id ?? matterId ?? leadId ?? `${kind}-${i}`),
    title: String(raw.title ?? raw.leadName ?? "—"),
    practiceArea: String(raw.practiceArea ?? raw.practiceAreaName ?? "—"),
    lawyers: String(raw.lawyers ?? raw.responsibleAttorney ?? "—"),
    clientName,
    comparePercentage: Number(raw.comparePercentage ?? raw.similarity ?? 0),
    clientEmail: String(raw.clientEmail ?? raw.email ?? "—"),
    clientPhone: String(raw.clientPhone ?? raw.phone ?? "—"),
    description: String(raw.description ?? raw.natureOfDispute ?? "—"),
    conflictCause: String(raw.conflictCause ?? raw.conflictDetails ?? raw.details ?? "—"),
    matterId,
    leadId,
  }
}

/** Build OLD-compatible flat conflict-check body. */
function buildConflictPayload(form: ConflictForm): Record<string, unknown> {
  const partyOpposingNames = form.partyOpposing
    .split("\n")
    .map(n => n.trim())
    .filter(Boolean)
  return {
    firstName: form.firstName.trim(),
    companyName: form.companyName.trim(),
    middleName: "",
    lastName: "",
    conflictCheckType: "name",
    phone: [form.phone.trim()],
    email: [form.email.trim()],
    partyOpposingFirstName: partyOpposingNames,
    partyOpposingLastName: partyOpposingNames,
    partyOpposingMiddleName: partyOpposingNames.map(() => ""),
    compareDoc: form.compareDoc.trim(),
    representativeInfoList: [],
  }
}

function normalizeResponse(raw: unknown, form: ConflictForm): ConflictCheckResponse {
  if (Array.isArray(raw)) {
    return { summary: raw as ConflictSummary[], clients: [], leads: [] }
  }
  const d = (raw ?? {}) as Record<string, unknown>
  const v3 = (d.response ?? d) as Record<string, unknown>
  const conflictLog = (v3.conflict_log ?? d.conflict_log ?? []) as Record<string, unknown>[]
  const clientsRaw = (d.clientsList ?? d.clients ?? []) as Record<string, unknown>[]
  const leadsRaw = (d.leadsList ?? d.leads ?? []) as Record<string, unknown>[]

  let summary: ConflictSummary[] = []
  if (Array.isArray(conflictLog) && conflictLog.length) {
    summary = conflictLog.map(log => ({
      name: String(log.name ?? log.party ?? "") || form.firstName || form.companyName || "Party",
      conflictStatus: String(log.status ?? log.conflictStatus ?? (Number(log.similarity ?? 0) > 0 ? "Conflicted" : "Cleared")),
      matchType: String(log.matchType ?? log.type ?? ""),
      details: String(log.details ?? log.reason ?? ""),
      aiSummary: String(log.summary ?? log.aiSummary ?? log.explanation ?? ""),
      existingClient: Boolean(log.existingClient),
      existingLead: Boolean(log.existingLead),
      existingMatter: log.existingMatter != null ? String(log.existingMatter) : undefined,
    }))
  } else {
    summary = [{
      name: form.firstName || form.companyName || "Check",
      conflictStatus: (clientsRaw.length || leadsRaw.length) ? "Conflicted" : "Cleared",
      existingClient: clientsRaw.length > 0,
      existingLead: leadsRaw.length > 0,
    }]
  }

  return {
    summary,
    clients: (Array.isArray(clientsRaw) ? clientsRaw : []).map((r, i) => mapMatch(r, i, "client")),
    leads: (Array.isArray(leadsRaw) ? leadsRaw : []).map((r, i) => mapMatch(r, i, "lead")),
  }
}

const clientColumns: ColumnDef<ConflictMatchRow>[] = [
  { field: "title", header: "Matter Title" },
  { field: "practiceArea", header: "Practice Area", width: 140 },
  { field: "lawyers", header: "Responsible Attorney" },
  { field: "clientName", header: "Client" },
  {
    field: "comparePercentage",
    header: "Similarity",
    width: 110,
    align: "right",
    renderCell: v => {
      const pct = Number(v ?? 0) <= 1 ? Number(v ?? 0) * 100 : Number(v ?? 0)
      return (
        <Typography sx={{ color: pct > 0 ? "error.main" : "success.main", fontWeight: 600 }}>
          {pct.toFixed(2)}%
        </Typography>
      )
    },
  },
  { field: "clientEmail", header: "Email" },
  { field: "clientPhone", header: "Phone", width: 130 },
  { field: "description", header: "Nature of Dispute" },
  { field: "conflictCause", header: "Conflict Details" },
]

const leadColumns: ColumnDef<ConflictMatchRow>[] = [
  { field: "title", header: "Lead / Title" },
  { field: "clientName", header: "Name" },
  {
    field: "comparePercentage",
    header: "Similarity",
    width: 110,
    align: "right",
    renderCell: v => {
      const pct = Number(v ?? 0) <= 1 ? Number(v ?? 0) * 100 : Number(v ?? 0)
      return (
        <Typography sx={{ color: pct > 0 ? "error.main" : "success.main", fontWeight: 600 }}>
          {pct.toFixed(2)}%
        </Typography>
      )
    },
  },
  { field: "clientEmail", header: "Email" },
  { field: "clientPhone", header: "Phone", width: 130 },
  { field: "conflictCause", header: "Conflict Details" },
]

export default function ConflictCheckPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ConflictForm>(EMPTY)
  const [result, setResult] = useState<ConflictCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultTab, setResultTab] = useState(0)

  const settingsQ = useQuery({
    queryKey: ["settings", "conflict-check"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return { aiConflictCheck: true }
      const res = await axiosClient.get("/api/settings/conflict-check-settings")
      return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
    },
    staleTime: 60_000,
  })

  const useAi = Boolean(
    settingsQ.data?.aiConflictCheck === true
    || settingsQ.data?.enableAutoConflictCheck === true,
  )

  function setField<K extends keyof ConflictForm>(key: K, value: ConflictForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function runCheck() {
    const payload = buildConflictPayload(form)
    const hasInput = Boolean(
      form.firstName.trim()
      || form.companyName.trim()
      || form.phone.trim()
      || form.email.trim()
      || form.partyOpposing.trim()
      || form.compareDoc.trim(),
    )
    if (!hasInput) {
      setError("Enter at least one search field before running a conflict check.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
        setResult({
          summary: [{
            name: form.firstName || form.companyName || "Sample",
            conflictStatus: "Conflicted",
            existingClient: true,
            aiSummary: useAi ? "Name similarity with active client matter." : undefined,
          }],
          clients: [mapMatch({
            matterId: "m1",
            title: "260303 — Building Dispute",
            practiceArea: "Litigation",
            lawyers: "Sarah Johnson",
            clientType: "COMPANY",
            companyName: form.companyName || "Opposing LLC",
            comparePercentage: 0.82,
            clientEmail: "ops@example.com",
            description: "Construction dispute",
            conflictCause: "Party opposing matches client name",
          }, 0, "client")],
          leads: [],
        })
        return
      }
      const endpoint = useAi
        ? "/api/conflict/check/multiple/mini/v3"
        : "/api/conflict/check/multiple/mini/v2"
      try {
        const res = await axiosClient.post(endpoint, payload)
        setResult(normalizeResponse(res.data?.data ?? res.data, form))
      } catch {
        const res = await axiosClient.post("/api/conflict/check/multiple/mini/v2", payload)
        setResult(normalizeResponse(res.data?.data ?? res.data, form))
      }
    } catch {
      setError("Conflict check failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const hasConflict = useMemo(() => {
    if (!result) return false
    return (
      result.summary.some(r => r.conflictStatus === "Conflicted")
      || result.clients.length > 0
      || result.leads.length > 0
    )
  }, [result])

  return (
    <PageShell title="Conflict Check" description="Check parties against existing clients, matters, and leads">
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField size="small" label="First / Full Name" value={form.firstName} onChange={e => setField("firstName", e.target.value)} />
          <TextField size="small" label="Company Name" value={form.companyName} onChange={e => setField("companyName", e.target.value)} />
          <TextField size="small" label="Phone" value={form.phone} onChange={e => setField("phone", e.target.value)} />
          <TextField size="small" label="Email" value={form.email} onChange={e => setField("email", e.target.value)} />
          <TextField
            size="small"
            label="Party Opposing"
            value={form.partyOpposing}
            onChange={e => setField("partyOpposing", e.target.value)}
            multiline
            minRows={3}
            helperText="One name per line"
            sx={{ gridColumn: { md: "1 / -1" } }}
          />
          <TextField
            size="small"
            label="Compare Document / Scope"
            value={form.compareDoc}
            onChange={e => setField("compareDoc", e.target.value)}
            multiline
            minRows={2}
            sx={{ gridColumn: { md: "1 / -1" } }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">
            {useAi ? "AI-enhanced check enabled (company settings)" : "Standard check (v2)"}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={() => { void runCheck() }}
            disabled={loading}
          >
            {loading ? "Checking…" : "Run Check"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => { void runCheck() }}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {result && (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Box
              sx={{
                p: 2.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: hasConflict ? "#FEF2F2" : "#F0FDF4",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              {hasConflict
                ? <><ErrorIcon color="error" /><Typography sx={{ fontWeight: 600, color: "error.main" }}>Conflict detected</Typography></>
                : <><CheckCircleIcon color="success" /><Typography sx={{ fontWeight: 600, color: "success.main" }}>No conflicts found</Typography></>}
            </Box>
            {result.summary.map((r, i) => (
              <Box key={i} sx={{ p: 2.5, borderBottom: i < result.summary.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 600, flex: 1 }}>{r.name ?? "Party"}</Typography>
                  <Chip
                    size="small"
                    label={r.conflictStatus ?? "No Conflict"}
                    color={r.conflictStatus === "Conflicted" ? "error" : "success"}
                    variant="outlined"
                  />
                </Box>
                {!!r.aiSummary && (
                  <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>AI analysis</Typography>
                    <Typography variant="body2">{r.aiSummary}</Typography>
                  </Alert>
                )}
                {!!r.details && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.details}</Typography>}
              </Box>
            ))}
          </Paper>

          <Tabs value={resultTab} onChange={(_, v) => setResultTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tab label={`Clients / Matters (${result.clients.length})`} />
            <Tab label={`Leads (${result.leads.length})`} />
          </Tabs>

          {resultTab === 0 && (
            <DataGrid<ConflictMatchRow>
              columns={clientColumns}
              queryKey={["conflict-check", "clients", result.clients.length, result.clients[0]?.id]}
              queryFn={async (_p: GridParams) => pageOf(result.clients)}
              isPaginated={false}
              syncWithUrl={false}
              zebraStriping
              rowMenuItems={row => {
                const id = row.matterId
                return id ? [{ label: "Details", onClick: () => navigate(`/matters/${id}`) }] : []
              }}
              emptyState={<Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No client/matter matches</Typography>}
            />
          )}
          {resultTab === 1 && (
            <DataGrid<ConflictMatchRow>
              columns={leadColumns}
              queryKey={["conflict-check", "leads", result.leads.length, result.leads[0]?.id]}
              queryFn={async (_p: GridParams) => pageOf(result.leads)}
              isPaginated={false}
              syncWithUrl={false}
              zebraStriping
              rowMenuItems={row => {
                const id = row.leadId
                return id ? [{ label: "Details", onClick: () => navigate(`/leads/${id}`) }] : []
              }}
              emptyState={<Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No lead matches</Typography>}
            />
          )}
        </>
      )}
    </PageShell>
  )
}
