import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Billable by Department"
      description="Department billing totals"
      queryKey={["reports", "billable-by-department"]}
      queryFn={p => reportsApi.getBillableByDepartment(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
        { field: "totalBilled", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "totalPaid", header: "Collected", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "outstanding", header: "Outstanding", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
