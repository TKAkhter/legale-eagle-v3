/**
 * Collections Report — LMS `/collections` parity (new UI).
 * Fetch by client + matter → Total Due / Paid summary + receipt rows
 * (Billed Amount, Paid Amount, Payment Mode, Payment Date).
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography } from "@mui/material"
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
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams, PageResponse } from "@/types/common.types"

type CollectionsPage = PageResponse<Record<string, unknown>> & {
  totalDue?: number
  totalPaid?: number
}

function CollectionsFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

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
      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => {
          setF({})
          onReset()
        }}
        searchLabel="Fetch"
      />
    </Box>
  )
}

export default function CollectionsReportPage() {
  const [gridFilters, setGridFilters] = useState<Record<string, unknown>>({})
  const [fetchKey, setFetchKey] = useState(0)

  const summaryQ = useQuery({
    queryKey: ["reports", "collections", "summary", gridFilters, fetchKey],
    queryFn: () => reportsApi.getCollections({
      page: 0,
      pageSize: 500,
      sortBy: "paymentDate",
      sortDir: "desc",
      filters: gridFilters,
    }) as Promise<CollectionsPage>,
    enabled: fetchKey > 0,
  })

  const totalDue = summaryQ.data?.totalDue ?? 0
  const totalPaid = summaryQ.data?.totalPaid ?? 0

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "dueAmount",
      header: "Billed Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "amount",
      header: "Paid Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "paymentMode",
      header: "Payment Mode",
      renderCell: v => String(v || "—"),
    },
    {
      field: "paymentDate",
      header: "Payment Date",
      sortKey: "paymentDate",
      renderCell: v => formatDate(String(v ?? "")),
    },
  ], [])

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return (
        <CollectionsFilters
          {...props}
          onSearch={f => {
            setGridFilters(f)
            setFetchKey(k => k + 1)
            props.onSearch(f)
          }}
          onReset={() => {
            setGridFilters({})
            setFetchKey(0)
            props.onReset()
          }}
        />
      )
    }
  }, [])

  async function queryFn(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (fetchKey === 0) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: p.pageSize,
        first: true,
        last: true,
        empty: true,
      }
    }
    return reportsApi.getCollections(p)
  }

  return (
    <PageShell title="Collections" description="Invoice collections and receipt payments by client">
      {fetchKey > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Collections Data
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <Typography variant="body2">
              Total Due: <strong>{formatCurrency(totalDue)}</strong>
            </Typography>
            <Typography variant="body2">
              Paid: <strong>{formatCurrency(totalPaid)}</strong>
            </Typography>
          </Box>
        </Paper>
      )}

      <DataGrid
        columns={columns}
        queryKey={["reports", "collections", fetchKey]}
        queryFn={queryFn}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl={false}
        defaultSortBy="paymentDate"
        defaultSortDir="desc"
        zebraStriping
        emptyState={
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {fetchKey === 0
              ? "Select filters and click Fetch"
              : "No receipts for the selected filters"}
          </Typography>
        }
      />
    </PageShell>
  )
}
