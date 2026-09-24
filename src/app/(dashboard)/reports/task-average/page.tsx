import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Task Average Report"
      description="Average task ratings by fee earner"
      queryKey={["reports", "task-average"]}
      queryFn={p => reportsApi.getTaskAverage(p)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "Fee Earner", renderCell: v => String(v || "—") },
        { field: "averageRating", header: "Avg Rating", align: "right", renderCell: v => String(v ?? "—") },
        { field: "taskCount", header: "Tasks", align: "right", renderCell: v => String(v ?? "—") },
      ]}
    />
  )
}
