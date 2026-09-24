import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function MattersReportPage() {
  return (
    <SimpleReportPage
      title="Matters Report"
      description="Matter listing with status and billing type"
      queryKey={["reports", "matters"]}
      queryFn={p => reportsApi.getMattersReport(p)}
      emailExcelFn={f => reportsApi.requestMattersReportExcel(f)}
      filters={{ showClient: true, showDepartment: true, showDateRange: true }}
      columns={[
        { field: "title", header: "Matter", sortKey: "title", renderCell: (v, row) => String(v ?? (row as { matterTitle?: string }).matterTitle ?? "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "billingType", header: "Billing Type", renderCell: v => String(v || "—") },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
        { field: "openDate", header: "Open Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
