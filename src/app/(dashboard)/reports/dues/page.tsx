/**
 * Dues Report — LMS `/dues` parity (new UI).
 * Filters: client, matter (client-scoped), days bucket (<30 / <60 / <90 / >90).
 * Columns: Client, Invoice No, Issued Date, Due Date, Due Amount, Days.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { Button } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  ClientSelectFilter,
  FilterActions,
  MatterSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

const DAYS_OPTIONS = [
  { value: "30", label: "< 30 Days" },
  { value: "60", label: "< 60 Days" },
  { value: "90", label: "< 90 Days" },
  { value: "360", label: "> 90 Days" },
]

function daysDiff(dueDate: string): number {
  if (!dueDate) return 0
  const start = new Date(dueDate)
  if (Number.isNaN(start.getTime())) return 0
  const end = new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function clientLabel(row: Record<string, unknown>): { id: string; name: string } {
  const mini = (row.clientMini ?? row.matterMini ?? row.client) as Record<string, unknown> | undefined
  if (mini && typeof mini === "object") {
    return {
      id: String(mini.id ?? row.clientId ?? ""),
      name: String(mini.companyName || mini.firstName || row.clientName || "—"),
    }
  }
  return {
    id: String(row.clientId ?? ""),
    name: String(row.clientName || "—"),
  }
}

function invoiceLabel(row: Record<string, unknown>): string {
  const prefix = String(row.invoicePrefix ?? "")
  const no = String(row.invoiceNo ?? "")
  if (!no) return "—"
  return prefix ? `${prefix}${no}` : no
}

function DuesFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter
        value={String(f.clientId ?? "") || undefined}
        onChange={v => {
          set("clientId", v)
          set("matterId", "")
        }}
      />
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => set("matterId", v)}
        clientId={String(f.clientId ?? "") || undefined}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Days</InputLabel>
        <Select
          label="Days"
          value={String(f.days ?? "")}
          onChange={e => set("days", e.target.value)}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {DAYS_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => {
          setF({})
          onApplied?.({})
          onReset()
        }}
      />
    </Box>
  )
}

export default function DuesReportPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "clientName",
      header: "Client",
      renderCell: (_v, row) => {
        const { id, name } = clientLabel(row)
        if (!id) return name
        return (
          <Link component={RouterLink} to={`/clients/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {name}
          </Link>
        )
      },
    },
    {
      field: "invoiceNo",
      header: "Invoice No.",
      renderCell: (_v, row) => invoiceLabel(row),
    },
    {
      field: "issueDate",
      header: "Issued Date",
      renderCell: v => formatDate(String(v ?? "")),
    },
    {
      field: "dueDate",
      header: "Due Date",
      renderCell: v => formatDate(String(v ?? "")),
    },
    {
      field: "dueAmount",
      header: "Due Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "days",
      header: "Days",
      renderCell: (_v, row) => {
        const diff = daysDiff(String(row.dueDate ?? ""))
        const abs = Math.abs(diff)
        if (diff < 0) {
          return (
            <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
              {abs} day/s remain/s
            </Typography>
          )
        }
        return (
          <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
            {abs} day/s passed
          </Typography>
        )
      },
    },
  ], [])

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <DuesFilters {...props} onApplied={setApplied} />
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestDuesExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Payment Dues"
      description="Outstanding invoice dues by client and matter"
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
        queryKey={["reports", "dues"]}
        queryFn={(p: GridParams) => reportsApi.getDues(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="dueDate"
        defaultSortDir="asc"
        zebraStriping
      />
    </PageShell>
  )
}
