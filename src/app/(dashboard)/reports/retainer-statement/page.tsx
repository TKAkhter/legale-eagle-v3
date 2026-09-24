import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Retainer Statement Report"
      description="Retainer statement summary"
      queryKey={["reports", "retainer-statement"]}
      queryFn={p => reportsApi.getRetainerStatementReport(p)}
      filters={{"showClient":true,"showMatter":true,"showDateRange":true}}
      columns={[
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "balance", header: "Balance", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
