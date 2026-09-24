import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function InvoicesReportPage() {
  return (
    <SimpleReportPage
      title="Invoices Report"
      description="Invoice listing by client and matter"
      queryKey={["reports", "invoices"]}
      queryFn={p => reportsApi.getInvoicesReport(p)}
      emailExcelFn={f => reportsApi.requestInvoicesReportExcel(f)}
      filters={{ showClient: true, showMatter: true, showDateRange: true }}
      columns={[
        { field: "invoiceNo", header: "Invoice", sortKey: "invoiceNo", renderCell: (v, row) => String(v ?? (row as { invoiceNumber?: string }).invoiceNumber ?? "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "totalAmount", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "invoiceDate", header: "Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
