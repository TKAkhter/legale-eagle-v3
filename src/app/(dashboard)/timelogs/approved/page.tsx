import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { timelogsApi } from "@/api/timelogs"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true, showDateRange: true, showUser: true })

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

/** Approved hourly timelogs browser (LMS /approved-timelogs). */
export default function TimelogsApprovedPage() {
  return (
    <PageShell title="Approved Timelogs" description="Browse approved hourly time entries">
      <DataGrid
        columns={[
          { field: "entryDate", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "activity", header: "Activity", renderCell: (v, row) => String(v ?? (row as { activityName?: string }).activityName ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: (v, row) => String(v ?? (row as { matter?: { title?: string } }).matter?.title ?? "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => String(v ?? (row as { client?: { companyName?: string } }).client?.companyName ?? "—") },
          {
            field: "totalHours",
            header: "Hours",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              if (r.totalHours != null) return Number(r.totalHours).toFixed(2)
              const h = Number(r.hours ?? 0)
              const m = Number(r.minutes ?? 0)
              return h || m ? `${h}:${String(m).padStart(2, "0")}` : "0"
            },
          },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "responsiblePerson", header: "User", renderCell: v => personName(v) },
          { field: "revenueStatus", header: "Status", renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { status?: string }).status ?? "Approved")} /> },
        ]}
        queryKey={["timelogs", "approved"]}
        queryFn={(p: GridParams) => timelogsApi.getApproved(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
      />
    </PageShell>
  )
}
