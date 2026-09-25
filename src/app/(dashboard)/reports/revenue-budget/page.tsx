/**
 * Revenue vs Budget — LMS `/revenue-budget-report` parity.
 * Filters: period (required), department, fee earner + Email Excel.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, TextField, Typography } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  DepartmentFilter,
  FilterActions,
  UserSelectFilter,
} from "@/components/filters"
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
  return {
    fromDate: monthStart(),
    toDate: today(),
    departmentId: "",
    userId: "",
  }
}

function signedColor(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "inherit"
  return n > 0 ? "success.main" : "error.main"
}

function RevenueBudgetFilters({
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
    if (!next.fromDate || !next.toDate) {
      toast.error("Period From and Period To are required")
      return
    }
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <TextField
        size="small"
        type="date"
        label="Period From"
        required
        value={String(f.fromDate ?? "")}
        onChange={e => set("fromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Period To"
        required
        value={String(f.toDate ?? "")}
        onChange={e => set("toDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <DepartmentFilter
        value={String(f.departmentId ?? "")}
        onChange={v => set("departmentId", v)}
      />
      <UserSelectFilter
        value={String(f.userId ?? "")}
        onChange={v => set("userId", v)}
        label="Fee Earner"
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

export default function RevenueBudgetPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>(defaultFilters)
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <RevenueBudgetFilters {...props} onApplied={setApplied} />
    }
  }, [])

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "responsiblePersonName",
      header: "Fee Earner",
      minWidth: 180,
      renderCell: (v, row) => String(v || (row as Record<string, unknown>).feName || "—"),
    },
    {
      field: "departmentName",
      header: "Department",
      minWidth: 140,
      renderCell: v => String(v || "—"),
    },
    {
      field: "actualRevenue",
      header: "Actual Rev (YTD)",
      align: "right",
      renderCell: v => (
        <Typography variant="body2" sx={{ color: signedColor(v), fontWeight: 500 }}>
          {formatCurrency(Number(v ?? 0))}
        </Typography>
      ),
    },
    {
      field: "totalBudget",
      header: "Budget (YTD)",
      align: "right",
      renderCell: (v, row) => {
        const n = v ?? (row as Record<string, unknown>).budgetYTD
        return (
          <Typography variant="body2" sx={{ color: signedColor(n), fontWeight: 500 }}>
            {formatCurrency(Number(n ?? 0))}
          </Typography>
        )
      },
    },
    {
      field: "variation",
      header: "Var (YTD)",
      align: "right",
      renderCell: (v, row) => {
        const n = v ?? (row as Record<string, unknown>).varianceYTD
        return (
          <Typography variant="body2" sx={{ color: signedColor(n), fontWeight: 500 }}>
            {formatCurrency(Number(n ?? 0))}
          </Typography>
        )
      },
    },
    {
      field: "variationPercentage",
      header: "Var %",
      align: "right",
      renderCell: (v, row) => {
        const n = Number(v ?? (row as Record<string, unknown>).variancePercent)
        if (!Number.isFinite(n)) return "—"
        return (
          <Typography variant="body2" sx={{ color: signedColor(n), fontWeight: 500 }}>
            {n.toFixed(2)}%
          </Typography>
        )
      },
    },
  ], [])

  async function handleEmailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestRevenueBudgetExcel({
        ...applied,
        responsiblePersonId: applied.userId,
      }))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Revenue vs Budget"
      description="Fee earner actual revenue compared to budget targets"
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
        queryKey={["reports", "revenue-budget"]}
        queryFn={(p: GridParams) => reportsApi.getRevenueBudget({
          ...p,
          filters: {
            ...applied,
            ...p.filters,
            responsiblePersonId: (p.filters?.userId ?? applied.userId) || "",
          },
        })}
        FilterPanel={FilterPanel}
        hasFilters
        defaultPageSize={10}
        defaultSortBy="responsiblePersonName"
        defaultSortDir="desc"
      />
    </PageShell>
  )
}
