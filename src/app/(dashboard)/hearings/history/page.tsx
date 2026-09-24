import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { hearingsApi } from "@/api/hearings"
import { formatDateTime } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showMatter: true })

export default function HearingHistoryPage() {
  return (
    <PageShell title="Hearing History" description="Closed and historical hearings">
      <DataGrid
        columns={[
          { field: "hearingTitle", header: "Hearing", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
          { field: "hearingDate", header: "Date", renderCell: v => v ? formatDateTime(String(v)) : "—" },
          { field: "location", header: "Location", renderCell: v => String(v || "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "Closed")} /> },
          { field: "decision", header: "Decision", renderCell: v => String(v || "—") },
        ]}
        queryKey={["hearings", "history"]}
        queryFn={(p: GridParams) => hearingsApi.getHistory(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
      />
    </PageShell>
  )
}
