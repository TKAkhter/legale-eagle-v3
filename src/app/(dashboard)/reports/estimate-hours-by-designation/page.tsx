import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Estimate Hours by Designation"
      description="Estimated hours breakdown by designation"
      queryKey={["reports", "estimate-hours-by-designation"]}
      queryFn={p => reportsApi.getEstimateHoursByDesignation(p)}
      filters={{"showMatter":true,"showDepartment":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "designation", header: "Designation", renderCell: v => String(v || "—") },
        { field: "estimatedHours", header: "Estimated", align: "right", renderCell: v => String(v ?? "—") },
        { field: "actualHours", header: "Actual", align: "right", renderCell: v => String(v ?? "—") },
      ]}
    />
  )
}
