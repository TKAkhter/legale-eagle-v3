import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function ActivitiesReportPage() {
  return (
    <SimpleReportPage
      title="Activities Report"
      description="Billable and non-billable activity entries"
      queryKey={["reports", "activities"]}
      queryFn={p => reportsApi.getActivitiesReport(p)}
      filters={{ showClient: true, showMatter: true, showUser: true, showDateRange: true }}
      columns={[
        { field: "activityName", header: "Activity", sortKey: "activityName", renderCell: (v, row) => String(v ?? (row as { activity?: string }).activity ?? "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "hours", header: "Hours", align: "right", renderCell: (v, row) => String(v ?? (row as { totalHours?: number }).totalHours ?? "—") },
        { field: "entryDate", header: "Date", renderCell: v => String(v || "—") },
        { field: "billingType", header: "Billing", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
