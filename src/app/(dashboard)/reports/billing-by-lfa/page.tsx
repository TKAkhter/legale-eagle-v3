import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Billing by LFA"
      description="Billing amounts based on LFA"
      queryKey={["reports", "billing-by-lfa"]}
      queryFn={p => reportsApi.getBillingByLfa(p)}
      filters={{"showClient":true,"showMatter":true,"showDateRange":true}}
      columns={[
        { field: "agreementNo", header: "LFA", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "billed", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "collected", header: "Collected", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
