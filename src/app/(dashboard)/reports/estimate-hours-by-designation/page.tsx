/**
 * Estimate Hours by Designation — LMS `/estimate-hours-by-designation-report` parity.
 * Matter summary grid + Email Excel (detail drill-down left for a follow-up).
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import { Box, Button, Link, Typography } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { FilterActions, MatterSelectFilter } from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function signedColor(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "inherit"
  return n > 0 ? "success.main" : "error.main"
}

function pct(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n.toFixed(2)}%`
}

function EstimateHoursFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>(filters)

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => setF(p => ({ ...p, matterId: v ?? "" }))}
      />
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

export default function EstimateHoursByDesignationPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <EstimateHoursFilters {...props} onApplied={setApplied} />
    }
  }, [])

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "clientName",
      header: "Client",
      minWidth: 180,
      renderCell: (v, row) => {
        const id = String((row as Record<string, unknown>).clientId ?? "")
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
      field: "matterTitle",
      header: "Matter",
      minWidth: 140,
      renderCell: (v, row) => {
        const id = String((row as Record<string, unknown>).matterId ?? (row as Record<string, unknown>).id ?? "")
        const title = String(v || "—")
        if (!id || title === "—") return title
        return (
          <Link component={RouterLink} to={`/matters/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {title}
          </Link>
        )
      },
    },
    { field: "lfaNo", header: "LFA", minWidth: 110, renderCell: v => String(v || "—") },
    {
      field: "projectedHours",
      header: "Projected Hours",
      align: "right",
      renderCell: v => (v == null ? "—" : Number(v).toFixed(2)),
    },
    {
      field: "projectedAmount",
      header: "Projected Amount",
      align: "right",
      renderCell: v => (
        <Typography variant="body2" sx={{ color: signedColor(v), fontWeight: 600 }}>
          {formatCurrency(Number(v ?? 0))}
        </Typography>
      ),
    },
    {
      field: "totalEstimateAmountWithProfitMargin",
      header: "Est. Amt (w/ Margin)",
      align: "right",
      minWidth: 160,
      renderCell: v => (
        <Typography variant="body2" sx={{ color: signedColor(v), fontWeight: 600 }}>
          {formatCurrency(Number(v ?? 0))}
        </Typography>
      ),
    },
    {
      field: "actualHours",
      header: "Actual Hours",
      align: "right",
      renderCell: v => (v == null ? "—" : Number(v).toFixed(2)),
    },
    {
      field: "actualAmount",
      header: "Actual Amount",
      align: "right",
      renderCell: v => (
        <Typography variant="body2" sx={{ color: signedColor(v), fontWeight: 600 }}>
          {formatCurrency(Number(v ?? 0))}
        </Typography>
      ),
    },
    {
      field: "marginCost",
      header: "Margin",
      align: "right",
      renderCell: v => (
        <Typography variant="body2" sx={{ color: signedColor(v), fontWeight: 600 }}>
          {formatCurrency(Number(v ?? 0))}
        </Typography>
      ),
    },
    {
      field: "marginPercent",
      header: "% Margin",
      align: "right",
      renderCell: v => pct(v),
    },
  ], [])

  async function handleEmailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestEstimateHoursByDesignationExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Estimate Hours by Designation"
      description="Projected vs actual hours and amounts by matter"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<MarkunreadOutlinedIcon />}
          disabled={emailing}
          onClick={() => { void handleEmailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "estimate-hours-by-designation"]}
        queryFn={(p: GridParams) => reportsApi.getEstimateHoursByDesignation({
          ...p,
          filters: { ...applied, ...p.filters },
        })}
        FilterPanel={FilterPanel}
        hasFilters
        defaultPageSize={10}
        isSortingBackend={false}
      />
    </PageShell>
  )
}
