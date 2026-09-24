import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Audit Report"
      description="Audit record listing"
      queryKey={["reports", "audit"]}
      queryFn={p => reportsApi.getAuditReport(p)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "action", header: "Action", renderCell: v => String(v || "—") },
        { field: "entityType", header: "Entity", renderCell: v => String(v || "—") },
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "createdAt", header: "Date", renderCell: v => String(v || "—") },
        { field: "details", header: "Details", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
