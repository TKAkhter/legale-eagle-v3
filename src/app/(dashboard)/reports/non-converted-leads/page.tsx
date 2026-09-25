/**
 * Non-Converted Leads report — LMS `/non-converted-leads` parity (new UI).
 * Filters: created-at date range + status (Open / Write Off / both).
 * Columns match OLD List mapRows; Email Excel passes applied filters.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { DateRangeFilter, FilterActions } from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultFilters(): Record<string, unknown> {
  return { fromDate: monthStart(), toDate: today(), status: "" }
}

function pick(row: Record<string, unknown>, keys: string[], fallback = "—"): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== "") return String(v)
  }
  return fallback
}

function textValue(value: unknown, fallback = "—"): string {
  if (value === undefined || value === null || value === "") return fallback
  if (Array.isArray(value)) {
    if (!value.length) return fallback
    const first = value[0] as unknown
    if (typeof first === "string") return first
    const o = first as { emailId?: string; phoneNo?: string; value?: string }
    return o?.emailId || o?.phoneNo || o?.value || fallback
  }
  if (typeof value === "object") {
    const o = value as { emailId?: string; phoneNo?: string; value?: string }
    return o.emailId || o.phoneNo || o.value || fallback
  }
  return String(value)
}

function formatDuration(hours: unknown, minutes: unknown): string {
  return `${Number(hours || 0)} h: ${Number(minutes || 0)} m`
}

function ScopeCell({ value }: { value: string }) {
  if (!value || value === "—") return <Typography variant="body2">—</Typography>
  if (value.length <= 30) return <Typography variant="body2">{value}</Typography>
  return (
    <Tooltip title={value} placement="bottom" arrow>
      <Typography variant="body2" sx={{ cursor: "pointer" }}>
        {`${value.substring(0, 30)}...`}
      </Typography>
    </Tooltip>
  )
}

function NonConvertedFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>(() => ({ ...defaultFilters(), ...filters }))
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    const initial = { ...defaultFilters(), ...filters }
    setF(initial)
    onApplied?.(initial)
    onSearch(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, [])

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={({ fromDate, toDate }) => {
          set("fromDate", fromDate ?? "")
          set("toDate", toDate ?? "")
        }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Status</InputLabel>
        <Select
          label="Status"
          value={String(f.status ?? "")}
          onChange={e => set("status", e.target.value)}
        >
          <MenuItem value="">Open & Write Off</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="Write Off">Write Off</MenuItem>
        </Select>
      </FormControl>
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => {
          const next = defaultFilters()
          setF(next)
          onApplied?.(next)
          onReset()
          onSearch(next)
        }}
      />
    </Box>
  )
}

export default function NonConvertedLeadsReportPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>(defaultFilters())
  const [emailing, setEmailing] = useState(false)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "leadName",
      header: "Lead Name",
      sortKey: "leadName",
      minWidth: 160,
      renderCell: (_v, row) => {
        const id = pick(row, ["leadId", "id", "_id"], "")
        const name = pick(row, ["leadName", "companyName", "name", "fullName", "firstName"])
        if (!id) return name
        return (
          <Link
            component={RouterLink}
            to={`/leads/${id}`}
            underline="hover"
            onClick={e => e.stopPropagation()}
          >
            {name}
          </Link>
        )
      },
    },
    {
      field: "leadType",
      header: "Lead Type",
      renderCell: (_v, row) => pick(row, ["leadType", "typeLead"]),
    },
    {
      field: "status",
      header: "Status",
      renderCell: (_v, row) => pick(row, ["status", "leadStatus"]),
    },
    {
      field: "email",
      header: "Email",
      renderCell: (_v, row) => textValue(row.email ?? row.emailId),
    },
    {
      field: "phone",
      header: "Phone",
      renderCell: (_v, row) => textValue(row.phone ?? row.phoneNo ?? row.mobile),
    },
    {
      field: "scopeOfWork",
      header: "Scope of Work",
      minWidth: 160,
      renderCell: (_v, row) => (
        <ScopeCell value={pick(row, ["scopeOfWork", "natureOfDispute"])} />
      ),
    },
    {
      field: "responsiblePersonName",
      header: "Responsible Person",
      renderCell: v => String(v || "—"),
    },
    {
      field: "timeDisplay",
      header: "Time",
      renderCell: (_v, row) => formatDuration(row.hours, row.minutes),
    },
    {
      field: "hourlyUnit",
      header: "Hourly Unit",
      renderCell: v => String(v || "—"),
    },
    {
      field: "rate",
      header: "Rate",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : String(v)),
    },
    {
      field: "total",
      header: "Total",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : String(v)),
    },
    {
      field: "leadEstimate",
      header: "Proposed Estimate",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : formatCurrency(Number(v))),
    },
    {
      field: "approvedEstimate",
      header: "Approved Estimate",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : formatCurrency(Number(v))),
    },
  ], [])

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <NonConvertedFilters {...props} onApplied={setApplied} />
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestNonConvertedLeadsExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Non-Converted Leads"
      description="Leads with activity time that have not converted"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<MarkunreadOutlinedIcon />}
          disabled={emailing}
          onClick={() => void emailExcel()}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "non-converted-leads"]}
        queryFn={(p: GridParams) => reportsApi.getNonConvertedLeads(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="leadName"
        defaultSortDir="asc"
        zebraStriping
      />
    </PageShell>
  )
}
