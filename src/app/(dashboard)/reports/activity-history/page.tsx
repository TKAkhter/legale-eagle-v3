/**
 * Activity History Report — LMS `/activity-history-report` parity (new UI).
 * Filters: category, client, matter, responsible, performed-by, modification type, date range.
 * Columns match OLD HistoryList; Email Excel passes applied filters.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  ClientSelectFilter,
  FilterActions,
  MatterSelectFilter,
  UserSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

const CATEGORY_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "BUSINESS_DEVELOPMENT", label: "Business Development" },
  { value: "CLIENT", label: "Client" },
  { value: "LEAD", label: "Lead" },
  { value: "LEAVE", label: "Leave" },
  { value: "MATTER", label: "Matter" },
  { value: "TRAINING_AND_DEVELOPMENT", label: "Training And Development" },
]

const MODIFICATION_OPTIONS = [
  { value: "EDIT", label: "Edit" },
  { value: "PURGE", label: "Purge" },
  { value: "PURGE_MERGE", label: "Purge Merge" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "DISCOUNT_MERGE", label: "Discount Merge" },
  { value: "DELETE", label: "Delete" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(o => [o.value, o.label]),
)

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatModType(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function hm(hours: unknown, minutes: unknown): string {
  return `${Number(hours ?? 0)}h : ${Number(minutes ?? 0)}m`
}

function ActivityHistoryFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>({
    fromDate: monthStart(),
    toDate: today(),
    ...filters,
  })
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={String(f.activityCategory ?? "")}
          onChange={e => set("activityCategory", e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {CATEGORY_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <ClientSelectFilter
        value={String(f.clientId ?? "") || undefined}
        onChange={v => set("clientId", v)}
      />
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => set("matterId", v)}
        clientId={String(f.clientId ?? "") || undefined}
      />
      <UserSelectFilter
        value={String(f.userId ?? "")}
        onChange={v => set("userId", v)}
        label="Responsible Person"
      />
      <UserSelectFilter
        value={String(f.performedById ?? "")}
        onChange={v => set("performedById", v)}
        label="Performed By"
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Modification Type</InputLabel>
        <Select
          label="Modification Type"
          value={String(f.modificationType ?? "")}
          onChange={e => set("modificationType", e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {MODIFICATION_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        type="date"
        label="Activity Created From"
        value={String(f.fromDate ?? "")}
        onChange={e => set("fromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Activity Created To"
        value={String(f.toDate ?? "")}
        onChange={e => set("toDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => {
          const next = { fromDate: monthStart(), toDate: today() }
          setF(next)
          onApplied?.(next)
          onReset()
        }}
      />
    </Box>
  )
}

export default function ActivityHistoryPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>({
    fromDate: monthStart(),
    toDate: today(),
  })
  const [emailing, setEmailing] = useState(false)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "activityCategory",
      header: "Category",
      renderCell: v => CATEGORY_LABEL[String(v ?? "")] ?? String(v || "—"),
    },
    {
      field: "clientName",
      header: "Client Name",
      renderCell: (v, row) => {
        const id = String(row.clientId ?? "")
        const name = String(v || row.leadName || "—")
        if (!id) return name
        return (
          <Link component={RouterLink} to={`/clients/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {name}
          </Link>
        )
      },
    },
    {
      field: "matterTitle",
      header: "Matter",
      renderCell: (v, row) => {
        const id = String(row.matterId ?? "")
        const title = String(v || "—")
        if (!id || title === "—") return title
        return (
          <Link component={RouterLink} to={`/matters/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {title}
          </Link>
        )
      },
    },
    {
      field: "matterSubject",
      header: "Matter Subject",
      renderCell: v => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }} title={String(v ?? "")}>
          {String(v || "—")}
        </Typography>
      ),
    },
    { field: "billingType", header: "Billing Type", renderCell: v => String(v || "—") },
    { field: "createdBy", header: "Performed By", renderCell: v => String(v || "—") },
    {
      field: "activityResponsiblePerson",
      header: "Responsible Person",
      renderCell: v => String(v || "—"),
    },
    {
      field: "activityCreatedAt",
      header: "Activity Created At",
      renderCell: v => formatDate(String(v ?? "")),
    },
    {
      field: "modificationDate",
      header: "Action Date",
      sortKey: "modificationDate",
      renderCell: v => formatDate(String(v ?? "")),
    },
    {
      field: "activityModificationType",
      header: "Modification Type",
      renderCell: v => (v ? formatModType(String(v)) : "—"),
    },
    {
      field: "beforeHours",
      header: "Before",
      renderCell: (_v, row) => hm(row.beforeHours, row.beforeMinutes),
    },
    {
      field: "afterHours",
      header: "After",
      renderCell: (_v, row) => hm(row.afterHours, row.afterMinutes),
    },
    {
      field: "hoursInUnitBefore",
      header: "Hours in unit Before",
      renderCell: v => (v != null && v !== "" ? Number(v).toFixed(2) : "—"),
    },
    {
      field: "hoursInUnitAfter",
      header: "Hours in unit After",
      renderCell: v => (v != null && v !== "" ? Number(v).toFixed(2) : "—"),
    },
    {
      field: "hoursChangeInUnit",
      header: "Hours Change in Unit",
      renderCell: v => {
        if (v == null || v === "") return "—"
        const n = Number(v)
        if (Number.isNaN(n) || n === 0) return n === 0 ? "0.00" : "—"
        return (
          <Typography component="span" sx={{ color: "primary.main", fontWeight: 700, fontSize: 13 }}>
            {n.toFixed(2)}
          </Typography>
        )
      },
    },
    {
      field: "rate",
      header: "Rate",
      align: "right",
      renderCell: v => (v != null && v !== "" ? Number(v).toFixed(2) : "—"),
    },
    {
      field: "amount",
      header: "Amount",
      align: "right",
      renderCell: v => {
        if (v == null || v === "") return "—"
        const n = Number(v)
        if (Number.isNaN(n)) return "—"
        return (
          <Typography
            component="span"
            sx={{ color: n >= 0 ? "success.main" : "error.main", fontWeight: 700, fontSize: 13 }}
          >
            {n.toFixed(2)}
          </Typography>
        )
      },
    },
    {
      field: "logSummary",
      header: "Summary",
      renderCell: (v, row) => String(v || row.note || "—"),
    },
    {
      field: "activityNote",
      header: "Description",
      renderCell: v => String(v || "—"),
    },
  ], [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestActivityHistoryExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <ActivityHistoryFilters {...props} onApplied={setApplied} />
    }
  }, [])

  return (
    <PageShell
      title="Activity History"
      description="Firm-wide activity modification history for the selected period"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={emailExcel}
          disabled={emailing}
        >
          {emailing ? "Sending…" : "Email Excel"}
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "activity-history"]}
        queryFn={(p: GridParams) => reportsApi.getActivityHistory(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="modificationDate"
        defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
