import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function DuesReportPage() {
  return (
    <SimpleReportPage
      title="Dues Report"
      description="Outstanding dues by client and matter"
      queryKey={["reports", "dues"]}
      queryFn={p => reportsApi.getDues(p)}
      emailExcelFn={f => reportsApi.requestDuesExcel(f)}
      filters={{ showClient: true, showMatter: true }}
      columns={[
        { field: "clientName", header: "Client", sortKey: "clientName" },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "invoiceNo", header: "Invoice", renderCell: v => String(v || "—") },
        { field: "dueAmount", header: "Due Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "overdueDays", header: "Overdue Days", align: "right", renderCell: v => String(v ?? "—") },
        { field: "dueDate", header: "Due Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
