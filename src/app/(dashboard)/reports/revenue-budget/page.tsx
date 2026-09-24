import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Revenue vs Budget"
      description="Revenue compared to budget targets"
      queryKey={["reports", "revenue-budget"]}
      queryFn={p => reportsApi.getRevenueBudget(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
        { field: "revenue", header: "Revenue", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "budget", header: "Budget", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "variance", header: "Variance", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
