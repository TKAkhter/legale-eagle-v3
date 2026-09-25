/**
 * Billed Amount report — LMS `/billed-amount` parity (new UI).
 * Filters: department, user, date range.
 * Columns: Responsible Person, Department, Total Billed, Write Off, Credit Note, Net.
 */
import { useMemo, useState } from "react"
import { Box, Button } from "@mui/material"
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
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function BilledAmountFilters({
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
      <DepartmentFilter
        value={String(f.departmentId ?? "") || undefined}
        onChange={v => set("departmentId", v ?? "")}
      />
      <UserSelectFilter
        value={String(f.userId ?? "") || undefined}
        onChange={v => set("userId", v ?? "")}
        label="User"
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
          setF({})
          onApplied?.({})
          onReset()
        }}
      />
    </Box>
  )
}

export default function BilledAmountReportPage() {
  const [applied, setApplied] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "responsiblePerson",
      header: "Responsible Person",
      minWidth: 160,
      renderCell: (v, row) => String(v || row.userName || "—"),
    },
    {
      field: "departmentName",
      header: "Department",
      minWidth: 140,
      renderCell: v => String(v || "—"),
    },
    {
      field: "billedAmount",
      header: "Total Billed Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "writeOffAmount",
      header: "Total Write Off Amount",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : formatCurrency(Number(v))),
    },
    {
      field: "creditNoteAmount",
      header: "Total Credit Note Amount",
      align: "right",
      renderCell: v => (v == null || v === "" ? "—" : formatCurrency(Number(v))),
    },
    {
      field: "netAmount",
      header: "Net Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
  ], [])

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <BilledAmountFilters {...props} onApplied={setApplied} />
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestBilledAmountExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Billed Amount"
      description="Fee-earner billed amounts, write-offs, credit notes, and net"
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
        queryKey={["reports", "billed-amount"]}
        queryFn={(p: GridParams) => reportsApi.getBilledAmount(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
