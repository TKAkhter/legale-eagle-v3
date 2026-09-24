import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { makeReportFilterPanel, type ReportFilterConfig } from "@/components/filters/ReportFilterPanel"
import type { ColumnDef } from "@/components/data-grid/types"
import type { GridParams, PageResponse } from "@/types/common.types"

interface Props {
  title: string
  description: string
  queryKey: string[]
  queryFn: (p: GridParams) => Promise<PageResponse<Record<string, unknown>>>
  columns: ColumnDef<Record<string, unknown>>[]
  filters?: ReportFilterConfig
}

export function SimpleReportPage({
  title,
  description,
  queryKey,
  queryFn,
  columns,
  filters = { showClient: true, showDateRange: true },
}: Props) {
  const FilterPanel = makeReportFilterPanel(filters)
  return (
    <PageShell title={title} description={description}>
      <DataGrid
        columns={columns}
        queryKey={queryKey}
        queryFn={queryFn}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
