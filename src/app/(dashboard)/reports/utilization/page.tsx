/**
 * Utilization Report — LMS `/utilization` parity (new UI).
 * Filters: attorney, department, date range.
 * Columns: recorded/target/billable/non-billable/admin breakdown + utilization %.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Box, Button, Typography } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  DateRangeFilter,
  DepartmentFilter,
  FilterActions,
  UserSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
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
  return { fromDate: monthStart(), toDate: today(), userId: "", departmentId: "" }
}

function hrs(v: unknown): string {
  return Number(v ?? 0).toFixed(2)
}

function pctCell(v: unknown) {
  const n = Number(v ?? 0)
  const color = n < 60 ? "error.main" : n < 80 ? "warning.main" : "success.main"
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color }}>
      {n.toFixed(2)}%
    </Typography>
  )
}

function UtilizationFilters({
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
      <UserSelectFilter
        value={String(f.userId ?? "") || undefined}
        onChange={v => set("userId", v ?? "")}
        label="Attorney"
      />
      <DepartmentFilter
        value={String(f.departmentId ?? "") || undefined}
        onChange={v => set("departmentId", v ?? "")}
      />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={({ fromDate, toDate }) => {
          set("fromDate", fromDate ?? "")
          set("toDate", toDate ?? "")
        }}
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

export default function UtilizationReportPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>(defaultFilters())
  const [emailing, setEmailing] = useState(false)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    { field: "feeEarner", header: "Attorney", minWidth: 140 },
    { field: "departmentName", header: "Department", minWidth: 120, renderCell: v => String(v || "—") },
    { field: "totalHours", header: "Total Recorded Hours", align: "right", renderCell: v => hrs(v) },
    { field: "targetHours", header: "Target Hours", align: "right", renderCell: v => hrs(v) },
    { field: "billableHours", header: "Billable Hours", align: "right", renderCell: v => hrs(v) },
    { field: "nonBillableHours", header: "Non-Billable Hours", align: "right", renderCell: v => hrs(v) },
    {
      field: "totalBillableAndNonBillable",
      header: "Billable & Non-Billables Hours",
      align: "right",
      renderCell: v => hrs(v),
    },
    { field: "adminHours", header: "Admin Hours (1)", align: "right", renderCell: v => hrs(v) },
    { field: "bdHours", header: "BD Hours (2)", align: "right", renderCell: v => hrs(v) },
    { field: "preEngageHours", header: "Pre Engage Hours (3)", align: "right", renderCell: v => hrs(v) },
    { field: "sickLeaveHours", header: "Sick Leave Hours (4)", align: "right", renderCell: v => hrs(v) },
    { field: "annualLeaveHours", header: "Annual Leave Hours (5)", align: "right", renderCell: v => hrs(v) },
    { field: "totalAdminHoursFixed", header: "Total Admin Hours", align: "right", renderCell: v => hrs(v) },
    {
      field: "percentOnRecordedHours",
      header: "Utilization On Recorded Hours %",
      align: "right",
      renderCell: pctCell,
    },
    {
      field: "percentOnTargetHours",
      header: "Utilization On Targeted Hours %",
      align: "right",
      renderCell: pctCell,
    },
    {
      field: "adminHoursOnTargetHours",
      header: "Admin Hours On Target Hours %",
      align: "right",
      renderCell: v => `${Number(v ?? 0).toFixed(2)}%`,
    },
    {
      field: "BDHoursOnTargetHours",
      header: "BD Hours On Target Hours %",
      align: "right",
      renderCell: v => `${Number(v ?? 0).toFixed(2)}%`,
    },
    {
      field: "preEngageHoursOnTargetHours",
      header: "Pre Engage On Target Hours %",
      align: "right",
      renderCell: v => `${Number(v ?? 0).toFixed(2)}%`,
    },
    {
      field: "totalAdminHoursOnTargetHours",
      header: "Total Admin On Target Hours %",
      align: "right",
      renderCell: v => `${Number(v ?? 0).toFixed(2)}%`,
    },
  ], [])

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <UtilizationFilters {...props} onApplied={setApplied} />
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestUtilizationExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Utilization Report"
      description="Billable vs recorded/target hours by fee earner"
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
        queryKey={["reports", "utilization"]}
        queryFn={(p: GridParams) => reportsApi.getUtilization(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
