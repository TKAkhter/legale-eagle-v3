import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function ProfitLossReportPage() {
  return (
    <SimpleReportPage
      title="Profit & Loss"
      description="Revenue, cost, and profit by fee earner"
      queryKey={["reports", "profit-loss"]}
      queryFn={p => reportsApi.getProfitLoss(p)}
      filters={{ showUser: true, showDepartment: true, showDateRange: true }}
      columns={[
        { field: "userName", header: "Fee Earner", sortKey: "userName" },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
        { field: "revenue", header: "Revenue", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "cost", header: "Cost", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "profit", header: "Profit", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
