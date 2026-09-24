import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Closed Matters"
      description="Closed matter form search results"
      queryKey={["reports", "closed-matters"]}
      queryFn={p => reportsApi.getClosedMatters(p)}
      filters={{"showClient":true,"showDateRange":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "closedDate", header: "Closed", renderCell: v => String(v || "—") },
        { field: "closedBy", header: "Closed By", renderCell: v => String(v || "—") },
        { field: "reason", header: "Reason", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
