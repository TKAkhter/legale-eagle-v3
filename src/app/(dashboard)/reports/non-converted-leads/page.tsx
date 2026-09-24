import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function NonConvertedLeadsReportPage() {
  return (
    <SimpleReportPage
      title="Non-Converted Leads"
      description="Leads with activity time that have not converted"
      queryKey={["reports", "non-converted-leads"]}
      queryFn={p => reportsApi.getNonConvertedLeads(p)}
      filters={{ showUser: true, showDateRange: true }}
      columns={[
        { field: "leadName", header: "Lead", sortKey: "leadName", renderCell: (v, row) => String(v ?? (row as { companyName?: string }).companyName ?? "—") },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "hours", header: "Hours", align: "right", renderCell: (v, row) => String(v ?? (row as { totalHours?: number }).totalHours ?? "—") },
        { field: "ownerName", header: "Owner", renderCell: v => String(v || "—") },
        { field: "createdAt", header: "Created", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
