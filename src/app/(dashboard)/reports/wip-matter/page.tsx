import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="WIP by Matter"
      description="Work in progress grouped by matter"
      queryKey={["reports", "wip-matter"]}
      queryFn={p => reportsApi.getWipMatter(p)}
      filters={{"showMatter":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "userName", header: "Attorney", renderCell: v => String(v || "—") },
        { field: "totalHours", header: "Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "totalAmount", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "revenueStatus", header: "Status", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
