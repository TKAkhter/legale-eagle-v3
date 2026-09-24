import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function CostAnalysisReportPage() {
  return (
    <SimpleReportPage
      title="Cost Analysis"
      description="LFA cost, billed amount, and margin"
      queryKey={["reports", "cost-analysis"]}
      queryFn={p => reportsApi.getCostAnalysis(p)}
      filters={{ showMatter: true, showDateRange: true }}
      columns={[
        { field: "agreementNo", header: "LFA", sortKey: "agreementNo" },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "cost", header: "Cost", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "billed", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "margin", header: "Margin", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
