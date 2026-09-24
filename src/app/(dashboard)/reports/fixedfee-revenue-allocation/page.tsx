import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Fixed Fee Revenue Allocation"
      description="Revenue allocation for fixed-fee matters"
      queryKey={["reports", "fixedfee-revenue-allocation"]}
      queryFn={p => reportsApi.getFixedFeeRevenueAllocation(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "userName", header: "Fee Earner", renderCell: v => String(v || "—") },
        { field: "allocated", header: "Allocated", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
