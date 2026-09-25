/**
 * Leads Reduction report — LMS `/leads-reduction-report` parity.
 * Filters + columns from GET `/leads/reductions`; Email Excel via `/leads/reductions/excel`.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  FilterActions,
  MatterSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
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
  return {
    fromDate: monthStart(),
    toDate: today(),
    leadConvertedFromDate: "",
    leadConvertedToDate: "",
    leadName: "",
    matterBillingType: "",
    matterId: "",
    status: "",
  }
}

function statusChipColor(status: string): "default" | "success" | "error" | "info" | "warning" {
  const s = status.toLowerCase()
  if (s === "converted" || s === "open") return "success"
  if (s === "closed" || s === "writeoff" || s === "written off" || s === "write off") return "error"
  if (s === "initiated") return "info"
  return "default"
}

function LeadsReductionFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>(() => ({
    ...defaultFilters(),
    ...filters,
  }))
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
      <TextField
        size="small"
        label="Lead Name"
        value={String(f.leadName ?? "")}
        onChange={e => set("leadName", e.target.value)}
        sx={{ minWidth: 160 }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Billing Type</InputLabel>
        <Select
          label="Billing Type"
          value={String(f.matterBillingType ?? "")}
          onChange={e => set("matterBillingType", e.target.value)}
        >
          <MenuItem value=""><em>All</em></MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => set("matterId", v ?? "")}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Lead Status</InputLabel>
        <Select
          label="Lead Status"
          value={String(f.status ?? "")}
          onChange={e => set("status", e.target.value)}
        >
          <MenuItem value=""><em>All</em></MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="Close">Close</MenuItem>
          <MenuItem value="close-converted">Converted</MenuItem>
          <MenuItem value="close-write-off">Write Off</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        type="date"
        label="Created From"
        value={String(f.fromDate ?? "")}
        onChange={e => set("fromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Created To"
        value={String(f.toDate ?? "")}
        onChange={e => set("toDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Converted From"
        value={String(f.leadConvertedFromDate ?? "")}
        onChange={e => set("leadConvertedFromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Converted To"
        value={String(f.leadConvertedToDate ?? "")}
        onChange={e => set("leadConvertedToDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
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

export default function LeadsReductionPage() {
  const navigate = useNavigate()
  const [applied, setApplied] = useState<Record<string, unknown>>(defaultFilters)
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <LeadsReductionFilters {...props} onApplied={setApplied} />
    }
  }, [])

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "nationality",
      header: "Nationality",
      renderCell: v => {
        if (Array.isArray(v)) {
          return (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {v.map((n, i) => (
                <Chip key={`${String(n)}-${i}`} size="small" label={String(n)} variant="outlined" color="success" />
              ))}
            </Box>
          )
        }
        return String(v || "—")
      },
    },
    { field: "leadType", header: "Lead Type", renderCell: v => String(v || "—") },
    {
      field: "clientName",
      header: "Client Name",
      renderCell: (v, row) => {
        const id = String(row.clientId ?? "")
        const name = String(v || "—")
        if (!id || name === "—") return name
        return (
          <Link component={RouterLink} to={`/clients/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {name}
          </Link>
        )
      },
    },
    {
      field: "title",
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
        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }} title={String(v ?? "")}>
          {String(v || "—")}
        </Typography>
      ),
    },
    { field: "leadName", header: "Lead Name", renderCell: v => String(v || "—") },
    {
      field: "leadStatus",
      header: "Lead Status",
      sortable: false,
      renderCell: (_v, row) => {
        const open = !row.converted && !row.writeOff
        return (
          <Chip size="small" label={open ? "OPEN" : "CLOSE"} color={open ? "success" : "error"} />
        )
      },
    },
    {
      field: "currentStatus",
      header: "Current Status",
      renderCell: v => {
        const s = String(v || "")
        if (!s) return "—"
        return <Chip size="small" label={s} color={statusChipColor(s)} />
      },
    },
    {
      field: "createdAt",
      header: "Created At",
      renderCell: v => (v ? formatDate(String(v)) : "—"),
    },
    {
      field: "leadConvertedDate",
      header: "Conversion Date",
      renderCell: v => (v ? formatDate(String(v)) : "—"),
    },
    {
      field: "leadWriteOffDate",
      header: "Write Off Date",
      renderCell: v => (v ? formatDate(String(v)) : "—"),
    },
    { field: "department", header: "Department", renderCell: v => String(v || "—") },
    {
      field: "description",
      header: "Description",
      sortKey: "natureOfDispute",
      renderCell: (_v, row) => {
        const text = String(row.natureOfDispute ?? row.description ?? "")
        if (!text) return "—"
        return (
          <Tooltip title={text}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
              {text}
            </Typography>
          </Tooltip>
        )
      },
    },
    {
      field: "proposedValue",
      header: "Proposed Value",
      align: "right",
      renderCell: v => (v != null && v !== "" ? formatCurrency(Number(v)) : "—"),
    },
    {
      field: "approvedValue",
      header: "Approved Value",
      align: "right",
      renderCell: v => (v != null && v !== "" ? formatCurrency(Number(v)) : "—"),
    },
    {
      field: "reductionPercentage",
      header: "Reduction %",
      align: "right",
      renderCell: v => (v != null && v !== "" ? `${Number(v)}%` : "—"),
    },
    {
      field: "reductionReason",
      header: "Reduction Reason",
      renderCell: v => {
        const text = String(v || "")
        if (!text) return "—"
        return (
          <Tooltip title={text}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
              {text}
            </Typography>
          </Tooltip>
        )
      },
    },
    {
      field: "approvedBy",
      header: "Approved By",
      renderCell: (_v, row) => String(row.approvedByName ?? row.approvedBy ?? "—"),
    },
    {
      field: "matterBillingType",
      header: "Billing Type",
      renderCell: (_v, row) => String(row.billingType ?? row.matterBillingType ?? "—"),
    },
  ], [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestLeadsReductionExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Leads Reduction"
      description="Lead value reduction analysis for converted and open leads"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
          disabled={emailing}
        >
          {emailing ? "Sending…" : "Email Excel"}
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "leads-reduction"]}
        queryFn={(p: GridParams) => reportsApi.getLeadsReduction(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="leadName"
        defaultSortDir="asc"
        zebraStriping
        onRowClick={row => {
          const id = String(row.id ?? "")
          if (id) navigate(`/leads/${id}`)
        }}
      />
    </PageShell>
  )
}
