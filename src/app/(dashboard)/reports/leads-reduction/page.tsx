import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Leads Reduction"
      description="Lead reduction / drop-off analysis"
      queryKey={["reports", "leads-reduction"]}
      queryFn={p => reportsApi.getLeadsReduction(p)}
      filters={{"showUser":true,"showDateRange":true}}
      columns={[
        { field: "stage", header: "Stage", renderCell: v => String(v || "—") },
        { field: "count", header: "Count", align: "right", renderCell: v => String(v ?? "—") },
        { field: "reductionPct", header: "Reduction %", align: "right", renderCell: v => String(v ?? "—") },
        { field: "userName", header: "Owner", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
