import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="WIP by Attorney"
      description="Work in progress grouped by fee earner"
      queryKey={["reports", "wip-attorney"]}
      queryFn={p => reportsApi.getWipAttorney(p)}
      filters={{"showUser":true,"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "Attorney", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "totalHours", header: "Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "totalAmount", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "revenueStatus", header: "Status", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
