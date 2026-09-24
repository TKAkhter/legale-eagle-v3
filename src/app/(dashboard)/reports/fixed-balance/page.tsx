import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Fixed Balance Amount"
      description="Fixed-fee balance amounts by LFA"
      queryKey={["reports", "fixed-balance"]}
      queryFn={p => reportsApi.getFixedBalance(p)}
      filters={{"showClient":true,"showMatter":true}}
      columns={[
        { field: "agreementNo", header: "LFA", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "balance", header: "Balance", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "totalAmount", header: "Total", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
