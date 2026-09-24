import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Margin Erosion Cache"
      description="Cached margin erosion comparison report"
      queryKey={["reports", "margin-erosion-cache"]}
      queryFn={p => reportsApi.getMarginErosionCache(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "userName", header: "Fee Earner", renderCell: v => String(v || "—") },
        { field: "erosionAmount", header: "Erosion", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "erosionPct", header: "Erosion %", align: "right", renderCell: v => String(v ?? "—") },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
