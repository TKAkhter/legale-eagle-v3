import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function LeadsReportPage() {
  return (
    <SimpleReportPage
      title="Leads Report"
      description="Lead pipeline status and value"
      queryKey={["reports", "leads"]}
      queryFn={p => reportsApi.getLeadsReport(p)}
      filters={{ showUser: true, showDateRange: true }}
      columns={[
        { field: "leadName", header: "Lead", sortKey: "leadName", renderCell: (v, row) => String(v ?? (row as { companyName?: string }).companyName ?? "—") },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "ownerName", header: "Owner", renderCell: v => String(v || "—") },
        { field: "value", header: "Value", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { estimatedValue?: number }).estimatedValue ?? 0)) },
        { field: "source", header: "Source", renderCell: v => String(v || "—") },
        { field: "createdAt", header: "Created", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
