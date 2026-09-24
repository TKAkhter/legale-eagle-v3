import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Matter Revenue Summary"
      description="Fixed-session matter revenue summary"
      queryKey={["reports", "matter-revenue-summary"]}
      queryFn={p => reportsApi.getMatterRevenueSummary(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "revenue", header: "Revenue", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "sessions", header: "Sessions", align: "right", renderCell: v => String(v ?? "—") },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
