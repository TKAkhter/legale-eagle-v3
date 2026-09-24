import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function ZohoOutstandingReportPage() {
  return (
    <SimpleReportPage
      title="Zoho Outstanding"
      description="Outstanding balances synced from Zoho Books"
      queryKey={["reports", "zoho-outstanding"]}
      queryFn={p => reportsApi.getZohoOutstanding(p)}
      filters={{ showClient: true, showDateRange: true }}
      columns={[
        { field: "clientName", header: "Client", sortKey: "clientName" },
        { field: "zohoInvoiceNo", header: "Zoho Invoice", renderCell: v => String(v || "—") },
        { field: "outstanding", header: "Outstanding", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "invoiceDate", header: "Invoice Date", renderCell: v => String(v || "—") },
        { field: "dueDate", header: "Due Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
