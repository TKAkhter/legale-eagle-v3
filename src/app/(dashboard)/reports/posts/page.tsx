import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Posts Report"
      description="Converted people leads / posts"
      queryKey={["reports", "posts"]}
      queryFn={p => reportsApi.getPostsReport(p)}
      filters={{"showDateRange":true}}
      columns={[
        { field: "firstName", header: "First Name", renderCell: v => String(v || "—") },
        { field: "lastName", header: "Last Name", renderCell: v => String(v || "—") },
        { field: "companyName", header: "Company", renderCell: v => String(v || "—") },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "email", header: "Email", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
