import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Lead Value Report"
      description="Lead value by procured-by user"
      queryKey={["reports", "lead-value"]}
      queryFn={p => reportsApi.getLeadValue(p)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "leadValue", header: "Lead Value", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "convertedValue", header: "Converted", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "leadCount", header: "Leads", align: "right", renderCell: v => String(v ?? "—") },
      ]}
    />
  )
}
