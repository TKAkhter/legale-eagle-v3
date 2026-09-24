import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function PurgedDiscountedReportPage() {
  return (
    <SimpleReportPage
      title="Purged / Discounted"
      description="Purged hours and discounted amounts by activity"
      queryKey={["reports", "purged-discounted"]}
      queryFn={p => reportsApi.getPurgedDiscounted(p)}
      filters={{ showDepartment: true, showDateRange: true }}
      columns={[
        { field: "activity", header: "Activity", sortKey: "activity", renderCell: (v, row) => String(v ?? (row as { activityName?: string }).activityName ?? "—") },
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "purgedHours", header: "Purged Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "discountedAmount", header: "Discounted", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
