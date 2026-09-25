import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Rating Report"
      description="Average task ratings by user"
      queryKey={["reports", "rating"]}
      queryFn={p => reportsApi.getRatingReport(p)}
      emailExcelFn={f => reportsApi.requestRatingReportExcel(f)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "averageRating", header: "Avg Rating", align: "right", renderCell: v => String(v ?? "—") },
        { field: "taskCount", header: "Tasks", align: "right", renderCell: v => String(v ?? "—") },
        { field: "fromDate", header: "From", renderCell: v => String(v || "—") },
        { field: "toDate", header: "To", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
