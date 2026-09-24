import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function AttorneyRevenueReportPage() {
  return (
    <SimpleReportPage
      title="Attorney Revenue"
      description="Billed and collected amounts by fee earner"
      queryKey={["reports", "attorney-revenue"]}
      queryFn={p => reportsApi.getAttorneyRevenue(p)}
      filters={{ showUser: true, showDepartment: true, showDateRange: true }}
      columns={[
        { field: "userName", header: "Attorney", sortKey: "userName" },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
        { field: "billed", header: "Billed", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { totalBilled?: number }).totalBilled ?? 0)) },
        { field: "collected", header: "Collected", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { totalPaid?: number }).totalPaid ?? 0)) },
        { field: "outstanding", header: "Outstanding", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
