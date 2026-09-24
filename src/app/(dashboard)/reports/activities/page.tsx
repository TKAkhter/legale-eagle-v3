import { useCallback, useRef, useState } from "react"
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  ClientSelectFilter,
  DateRangeFilter,
  DepartmentFilter,
  FilterActions,
  MatterSelectFilter,
  UserSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@/components/data-grid/types"

const CATEGORY_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BUSINESS_DEVELOPMENT: "Business Development",
  CLIENT: "Client",
  LEAD: "Lead",
  LEAVE: "Leave",
  MATTER: "Matter",
  TRAINING_AND_DEVELOPMENT: "Training And Development",
}

const CATEGORY_OPTIONS = [
  "Admin",
  "Business Development",
  "Client",
  "Lead",
  "Leave",
  "Matter",
  "Training And Development",
]

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

interface ActivitiesFiltersProps extends FilterPanelProps {
  onFiltersApplied?: (f: Record<string, unknown>) => void
}

function ActivitiesReportFilters({ onSearch, onReset, filters, onFiltersApplied }: ActivitiesFiltersProps) {
  const [f, setF] = useState<Record<string, unknown>>({ ...filters })
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  const lfasQ = useQuery({
    queryKey: ["lfa", "all-active", "activities-report"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "lfa1", agreementNo: "LFA-001", billingType: "Hourly" },
          { id: "lfa2", agreementNo: "LFA-002", billingType: "Fixed" },
        ]
      }
      const res = await axiosClient.get("/api/lfa/get/all/active")
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string; billingType?: string }[]
    },
    staleTime: 60_000,
  })

  const agreements = (lfasQ.data ?? []).filter(a => a.id)

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Billed/Unbilled</InputLabel>
        <Select
          label="Billed/Unbilled"
          value={String(f.activityType ?? "")}
          onChange={e => set("activityType", e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="Billed">Billed</MenuItem>
          <MenuItem value="UnBilled">UnBilled</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={String(f.category ?? "")}
          onChange={e => set("category", e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {CATEGORY_OPTIONS.map(c => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Billable</InputLabel>
        <Select
          label="Billable"
          value={f.billable === true || f.billable === "true" ? "true" : f.billable === false || f.billable === "false" ? "false" : ""}
          onChange={e => {
            const v = String(e.target.value)
            set("billable", v === "" ? "" : v === "true")
          }}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="true">Billable</MenuItem>
          <MenuItem value="false">Non-Billable</MenuItem>
        </Select>
      </FormControl>

      <Autocomplete
        size="small"
        sx={{ minWidth: 220 }}
        options={agreements}
        getOptionLabel={o => `${o.agreementNo ?? o.id}${o.billingType ? ` (${o.billingType})` : ""}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={agreements.find(a => a.id === String(f.lfaId ?? "")) ?? null}
        onChange={(_, v) => set("lfaId", v?.id ?? "")}
        renderInput={params => <TextField {...params} label="Agreement" />}
      />

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Entry Type</InputLabel>
        <Select
          label="Entry Type"
          value={String(f.activityBillingType ?? "All")}
          onChange={e => set("activityBillingType", e.target.value)}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>LFA Type</InputLabel>
        <Select
          label="LFA Type"
          value={String(f.matterBillingType ?? "All")}
          onChange={e => set("matterBillingType", e.target.value)}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>

      <DepartmentFilter
        value={String(f.departmentId ?? "") || undefined}
        onChange={v => set("departmentId", v ?? "")}
      />
      <UserSelectFilter value={String(f.userId ?? "")} onChange={v => set("userId", v ?? "")} />
      <ClientSelectFilter value={String(f.clientId ?? "") || undefined} onChange={v => set("clientId", v ?? "")} />
      <MatterSelectFilter value={String(f.matterId ?? "") || undefined} onChange={v => set("matterId", v ?? "")} />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <FilterActions
        onSearch={() => {
          onFiltersApplied?.(f)
          onSearch(f)
        }}
        onClear={() => {
          setF({})
          onFiltersApplied?.({})
          onReset()
        }}
        searchLabel="Search"
      />
    </Box>
  )
}

export default function ActivitiesReportPage() {
  const filtersRef = useRef<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useCallback((props: FilterPanelProps) => (
    <ActivitiesReportFilters
      {...props}
      onFiltersApplied={f => { filtersRef.current = f }}
    />
  ), [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestActivitiesReportExcel(filtersRef.current))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Activities Report"
      description="Billable and non-billable time log entries"
      action={(
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={[
          {
            field: "activityName",
            header: "Activity",
            sortKey: "activityName",
            renderCell: (v, row) => text(v ?? (row as { activity?: string }).activity),
          },
          {
            field: "matterSubject",
            header: "Matter Subject",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const mini = r.matterMini as { subject?: string } | undefined
              return text(v ?? mini?.subject)
            },
          },
          {
            field: "description",
            header: "Scope",
            renderCell: (v, row) => text(v ?? (row as { note?: string }).note),
          },
          {
            field: "activityRelatedTo",
            header: "Category",
            renderCell: v => {
              const key = String(v ?? "")
              return text(CATEGORY_LABELS[key] ?? v)
            },
          },
          {
            field: "clientName",
            header: "Client",
            renderCell: (v, row) => text(v ?? (row as { leadName?: string }).leadName ?? (row as { client?: string }).client),
          },
          {
            field: "entryDate",
            header: "Activity Date",
            renderCell: (v, row) => {
              const d = v ?? (row as { activityDate?: string }).activityDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "billingType",
            header: "Billing Type",
            renderCell: (v, row) => text(v ?? (row as { lfaBillingType?: string }).lfaBillingType),
          },
          {
            field: "activityType",
            header: "Entry Type",
            renderCell: v => text(v),
          },
          {
            field: "responsiblePersonName",
            header: "Lawyer",
            renderCell: (v, row) => text(v ?? (row as { responsiblePerson?: string }).responsiblePerson ?? (row as { userName?: string }).userName),
          },
          {
            field: "hours",
            header: "Hours",
            align: "right",
            renderCell: (v, row) => {
              const r = row as { hours?: number; minutes?: number }
              if (r.hours != null || r.minutes != null) return `${r.hours ?? 0} h : ${r.minutes ?? 0} m`
              return text(v ?? (row as { quantity?: unknown }).quantity)
            },
          },
          {
            field: "timeUnit",
            header: "Qty (hrs)",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as { hours?: number; minutes?: number }
              if (r.hours == null && r.minutes == null) return "—"
              return ((Number(r.hours ?? 0) * 60 + Number(r.minutes ?? 0)) / 60).toFixed(2)
            },
          },
          {
            field: "rate",
            header: "Rate",
            align: "right",
            renderCell: v => {
              const n = Number(v)
              return Number.isFinite(n) ? formatCurrency(n) : text(v)
            },
          },
          {
            field: "billing",
            header: "Billing Amount",
            align: "right",
            renderCell: (v, row) => {
              const n = Number(v ?? (row as { amount?: number; totalAmount?: number }).amount ?? (row as { totalAmount?: number }).totalAmount)
              return Number.isFinite(n) ? formatCurrency(n) : "—"
            },
          },
          {
            field: "note",
            header: "Description",
            renderCell: (v, row) => text(v ?? (row as { description?: string }).description),
          },
          {
            field: "billable",
            header: "Billing Status",
            renderCell: v => (v === true || v === "true" ? "Billable" : v === false || v === "false" ? "Non-billable" : text(v)),
          },
          {
            field: "invoiceCreated",
            header: "Is Billed",
            renderCell: v => (v === true || v === "true" || v === "Yes" ? "Yes" : v === false || v === "false" || v === "No" ? "No" : text(v)),
          },
          {
            field: "lfaNo",
            header: "Agreement No",
            renderCell: (v, row) => text(v ?? (row as { agreementNo?: string }).agreementNo),
          },
          {
            field: "departmentName",
            header: "Department",
            renderCell: (v, row) => text(v ?? (row as { department?: string }).department),
          },
          {
            field: "revenueStatus",
            header: "Revenue Status",
            renderCell: v => text(v),
          },
          {
            field: "matterTitle",
            header: "Matter",
            renderCell: v => text(v),
          },
          {
            field: "createdAt",
            header: "Created",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
        ]}
        queryKey={["reports", "activities"]}
        queryFn={(p: GridParams) => reportsApi.getActivitiesReport(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
