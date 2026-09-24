import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Procured By Revenue"
      description="Revenue attributed to procured-by users"
      queryKey={["reports", "procured-by"]}
      queryFn={p => reportsApi.getProcuredBy(p)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "Procured By", renderCell: v => String(v || "—") },
        { field: "revenue", header: "Revenue", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "leadCount", header: "Leads", align: "right", renderCell: v => String(v ?? "—") },
        { field: "matterCount", header: "Matters", align: "right", renderCell: v => String(v ?? "—") },
      ]}
    />
  )
}
