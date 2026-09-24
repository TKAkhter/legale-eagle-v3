import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function Page() {
  return (
    <SimpleReportPage
      title="Matter Billing Snapshot"
      description="Cached matter billing snapshot"
      queryKey={["reports", "matter-billing-snapshot"]}
      queryFn={p => reportsApi.getMatterBillingSnapshot(p)}
      filters={{"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "totalBilled", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "wip", header: "WIP", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
