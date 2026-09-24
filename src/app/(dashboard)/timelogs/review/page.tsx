import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import DraftsIcon from "@mui/icons-material/Drafts"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import { TimelogQueueFilter } from "../_components/TimelogQueueFilter"
import type { GridParams } from "@/types/common.types"

function personName(v: unknown): string {
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function clientName(v: unknown): string {
  const c = v as Record<string, string> | null
  return c?.companyName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "—"
}

export default function TimelogsReviewPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title="Timelogs Review"
      description="Non-hourly billable entries ready to mark as draft"
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "client", header: "Client", renderCell: v => clientName(v), minWidth: 140 },
          { field: "activity", header: "Description", renderCell: (v, row) => String(v || (row as Record<string, unknown>).note || "—"), minWidth: 160 },
          { field: "responsiblePerson", header: "Lawyer", renderCell: v => personName(v) },
          { field: "totalHours", header: "Hours", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "unit", header: "Unit", align: "right", renderCell: v => String(v ?? "—") },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "entryDate", header: "Entry Date", renderCell: v => formatDate(String(v ?? "")) },
          { field: "matter", header: "Matter", renderCell: v => (v as Record<string, string>)?.title ?? "—" },
          { field: "agreementNo", header: "Agreement No.", renderCell: v => String(v || "—") },
          { field: "lfaBillingType", header: "LFA Type", renderCell: v => <StatusBadge status={String(v || "—")} /> },
          { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["timelogs", "review"]}
        queryFn={(p: GridParams) => timelogsApi.getBillable(p)}
        FilterPanel={TimelogQueueFilter}
        hasFilters
        syncWithUrl
        hasRowSelection
        defaultSortBy="entryDate"
        defaultSortDir="desc"
        bulkActions={[{
          label: "Generate Draft",
          icon: <DraftsIcon fontSize="small" />,
          onClick: async (rows) => {
            try {
              const ids = rows.map(r => String((r as { id?: string }).id ?? "")).filter(Boolean)
              if (ids.length > 15) {
                toast.error("Select at most 15 entries")
                return
              }
              toast.success(await timelogsApi.markDraft(ids))
              setGridKey(k => k + 1)
              qc.invalidateQueries({ queryKey: ["timelogs"] })
            } catch {
              toast.error("Failed to mark draft")
            }
          },
        }]}
      />
    </PageShell>
  )
}
