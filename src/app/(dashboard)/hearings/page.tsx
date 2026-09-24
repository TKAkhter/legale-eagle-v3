import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { hearingsApi } from "@/api/hearings"
import { formatDateTime } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showMatter: true, showDateRange: true })

export default function HearingsPage() {
  return (
    <PageShell title="Hearings" description="Open and continued hearings across matters">
      <DataGrid
        columns={[
          { field: "hearingTitle", header: "Hearing", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
          { field: "caseNo", header: "Case No", renderCell: v => String(v || "—") },
          { field: "hearingDate", header: "Date", renderCell: v => v ? formatDateTime(String(v)) : "—" },
          { field: "location", header: "Location", renderCell: v => String(v || "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["hearings", "list"]}
        queryFn={(p: GridParams) => hearingsApi.getList(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
      />
    </PageShell>
  )
}
