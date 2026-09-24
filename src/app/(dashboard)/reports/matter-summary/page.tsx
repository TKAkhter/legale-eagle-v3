import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Matter Summary"
      description="Matter report by client and attorney"
      queryKey={["reports", "matter-summary"]}
      queryFn={p => reportsApi.getMatterSummary(p)}
      filters={{"showClient":true,"showUser":true,"showDateRange":true}}
      columns={[
        { field: "title", header: "Matter", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "attorneyName", header: "Attorney", renderCell: v => String(v || "—") },
        { field: "status", header: "Status", renderCell: v => String(v || "—") },
        { field: "billingType", header: "Billing", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
