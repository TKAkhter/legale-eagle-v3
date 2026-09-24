import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Billing Rate Analysis"
      description="Effective billing rates by fee earner"
      queryKey={["reports", "billing-rate-analysis"]}
      queryFn={p => reportsApi.getBillingRateAnalysis(p)}
      filters={{"showUser":true,"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "Fee Earner", renderCell: v => String(v || "—") },
        { field: "effectiveRate", header: "Effective Rate", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "standardRate", header: "Standard Rate", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "hours", header: "Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
