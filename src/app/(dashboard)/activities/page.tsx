/**
 * Activities — LMS `/activities` (billings/List firm-wide activity list).
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { Can } from "@components/ui/Can"
import { PERMISSIONS } from "@config/permissions"
import {
  ClientSelectFilter,
  DateRangeFilter,
  FilterActions,
  MatterSelectFilter,
  UserSelectFilter,
} from "@components/filters"
import { ActivityFormDrawer } from "../time-log-entries/_components/ActivityFormDrawer"
import { reportsApi } from "@/api/reports"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import { useTranslation } from "react-i18next"
import type { FilterPanelProps } from "@components/data-grid/types"

function ActivityFilters({
  onSearch,
  onReset,
  filters,
  onFiltersApplied,
}: FilterPanelProps & { onFiltersApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>({ ...filters })
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  const lfasQ = useQuery({
    queryKey: ["lfa", "all-active", "activities-list"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "lfa1", agreementNo: "LFA-001" },
          { id: "lfa2", agreementNo: "LFA-002" },
        ]
      }
      const res = await axiosClient.get("/api/lfa/get/all/active")
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string }[]
    },
    staleTime: 60_000,
  })

  const lfaOpts = (lfasQ.data ?? [])
    .map(l => ({ id: String(l.id ?? ""), label: String(l.agreementNo ?? l.id ?? "") }))
    .filter(l => l.id)

  function apply(next: Record<string, unknown>) {
    onFiltersApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <UserSelectFilter value={String(f.userId ?? "")} onChange={v => set("userId", v ?? "")} />
      <ClientSelectFilter value={String(f.clientId ?? "")} onChange={v => set("clientId", v ?? "")} />
      <MatterSelectFilter value={String(f.matterId ?? "")} onChange={v => set("matterId", v ?? "")} />
      <Autocomplete
        size="small"
        sx={{ minWidth: 180 }}
        options={lfaOpts}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={lfaOpts.find(o => o.id === String(f.lfaId ?? "")) ?? null}
        onChange={(_, v) => set("lfaId", v?.id ?? "")}
        renderInput={params => <TextField {...params} label="Agreement (LFA)" />}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Matter Billing</InputLabel>
        <Select
          label="Matter Billing"
          value={String(f.matterBillingType ?? "")}
          onChange={e => set("matterBillingType", e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Activity Billing</InputLabel>
        <Select
          label="Activity Billing"
          value={String(f.activityBillingType ?? "")}
          onChange={e => set("activityBillingType", e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Expense">Expense</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={Boolean(f.billable)}
            onChange={e => set("billable", e.target.checked || undefined)}
          />
        }
        label="Billable only"
      />
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => { setF({}); onFiltersApplied?.({}); onReset() }}
      />
    </Box>
  )
}

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

async function fetchActivities(p: GridParams) {
  const filters = {
    ...p.filters,
    sessionType: false,
    ...(p.filters?.billable ? { billable: true } : {}),
  }
  const page = await reportsApi.getActivitiesReport({ ...p, filters })
  return {
    ...page,
    content: page.content.map((r, i) => {
      const row = r as Record<string, unknown>
      return { ...row, id: String(row.id ?? row.activityId ?? i) }
    }),
  }
}

export default function ActivitiesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [activityType, setActivityType] = useState<"Time" | "Expense">("Time")
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestActivitiesReportExcel({
        ...appliedFilters,
        sessionType: false,
        ...(appliedFilters.billable ? { billable: true } : {}),
      }))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title={t("nav.activities")}
      description={t("pages.activitiesDesc")}
      action={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            disabled={emailing}
            startIcon={<MarkunreadOutlinedIcon />}
            onClick={() => { void emailExcel() }}
          >
            Email Excel
          </Button>
          <Can do={PERMISSIONS.TIMELOGS_CREATE}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditId(undefined); setActivityType("Time"); setFormOpen(true) }}
            >
              Log Time
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => { setEditId(undefined); setActivityType("Expense"); setFormOpen(true) }}
            >
              Log Expense
            </Button>
          </Can>
        </Box>
      }
    >
      <DataGrid
        columns={[
          {
            field: "activityName",
            header: "Activity",
            renderCell: (v, row) => text(v || (row as Record<string, unknown>).categoryName || (row as Record<string, unknown>).name),
          },
          { field: "billingType", header: "Billing Type", width: 120, renderCell: v => text(v) },
          {
            field: "billable",
            header: "Billable",
            width: 90,
            renderCell: v => (v === true || v === "true" || v === "Yes" ? "Yes" : v === false || v === "false" ? "No" : text(v)),
          },
          {
            field: "hours",
            header: "Qty / Hours",
            align: "right",
            width: 100,
            renderCell: (v, row) => text(v ?? (row as Record<string, unknown>).quantity ?? (row as Record<string, unknown>).duration),
          },
          {
            field: "amount",
            header: "Amount",
            align: "right",
            width: 110,
            renderCell: (v, row) => {
              const n = Number(v ?? (row as Record<string, unknown>).totalAmount ?? (row as Record<string, unknown>).fee ?? (row as Record<string, unknown>).billing ?? NaN)
              return Number.isFinite(n) ? formatCurrency(n) : "—"
            },
          },
          { field: "clientName", header: "Client", renderCell: v => text(v) },
          { field: "matterTitle", header: "Matter", renderCell: v => text(v) },
          {
            field: "lfaNo",
            header: "LFA",
            width: 110,
            renderCell: (v, row) => text(v || (row as Record<string, unknown>).agreementNo),
          },
          {
            field: "userName",
            header: "Added By",
            renderCell: (v, row) => text(v || (row as Record<string, unknown>).addedByName || (row as Record<string, unknown>).responsiblePerson),
          },
          {
            field: "activityDate",
            header: "Date",
            width: 120,
            renderCell: (v, row) => {
              const d = v || (row as Record<string, unknown>).createdAt || (row as Record<string, unknown>).entryDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "note",
            header: "Note",
            renderCell: (v, row) => text(v || (row as Record<string, unknown>).description),
          },
        ]}
        queryKey={["activities", "list"]}
        queryFn={(p: GridParams) => fetchActivities(p)}
        FilterPanel={props => (
          <ActivityFilters
            {...props}
            onFiltersApplied={setAppliedFilters}
          />
        )}
        hasFilters
        defaultPageSize={20}
        zebraStriping
        detailPath={row => {
          const r = row as Record<string, unknown>
          const id = String(r.activityId ?? r.id ?? "")
          return id ? `/time-log-entries/${id}` : "/time-log-entries"
        }}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.activityId ?? r.id ?? "")
          return [
            { label: "Open", onClick: () => navigate(id ? `/time-log-entries/${id}` : "/time-log-entries") },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => { setEditId(id); setFormOpen(true) },
            },
          ]
        }}
      />

      <ActivityFormDrawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditId(undefined) }}
        activityId={editId}
        defaultActivityType={activityType}
        onSuccess={() => {
          setFormOpen(false)
          setEditId(undefined)
          qc.invalidateQueries({ queryKey: ["activities", "list"] })
          toast.success(editId ? "Activity updated" : "Activity created")
        }}
      />
    </PageShell>
  )
}
