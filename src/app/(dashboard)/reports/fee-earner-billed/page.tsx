import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Fee Earner Billed in Matter"
      description="Billable WIP by fee earner within matters"
      queryKey={["reports", "fee-earner-billed"]}
      queryFn={p => reportsApi.getFeeEarnerBilled(p)}
      filters={{"showUser":true,"showDepartment":true,"showMatter":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "Fee Earner", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "totalHours", header: "Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "totalAmount", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
