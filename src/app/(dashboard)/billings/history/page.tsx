import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { billingApi } from "@/api/billing"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true, showDateRange: true })

/** Write-off / credit-note history (LMS /history). */
export default function BillingHistoryPage() {
  return (
    <PageShell title="Write-off / Credit History" description="Historical write-offs and credit notes">
      <DataGrid
        columns={[
          { field: "taxInvoiceNo", header: "Invoice #", renderCell: (v, row) => String(v ?? (row as { invoiceNo?: string }).invoiceNo ?? "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => String(v ?? (row as { client?: { companyName?: string } }).client?.companyName ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: (v, row) => String(v ?? (row as { matter?: { title?: string } }).matter?.title ?? "—") },
          { field: "type", header: "Type", renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { historyType?: string }).historyType ?? "")} /> },
          { field: "amount", header: "Amount", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { writeOffAmount?: number }).writeOffAmount ?? 0)) },
          { field: "reason", header: "Reason", renderCell: v => String(v || "—") },
          { field: "createdBy", header: "By", renderCell: v => String(v || "—") },
          { field: "createdAt", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
        ]}
        queryKey={["billings", "write-credit-history"]}
        queryFn={(p: GridParams) => billingApi.getWriteCreditHistory(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        detailPath={row => `/billings/${String((row as { invoiceId?: string; id?: string }).invoiceId ?? (row as { id?: string }).id ?? "")}`}
      />
    </PageShell>
  )
}
