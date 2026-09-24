import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function HearingsReportPage() {
  return (
    <SimpleReportPage
      title="Hearings Report"
      description="Upcoming and past hearings by matter"
      queryKey={["reports", "hearings"]}
      queryFn={p => reportsApi.getHearingsReport(p)}
      filters={{ showClient: true, showMatter: true, showDateRange: true }}
      columns={[
        { field: "hearingTitle", header: "Hearing", sortKey: "hearingTitle", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "hearingDate", header: "Date", renderCell: v => String(v || "—") },
        { field: "location", header: "Location", renderCell: v => String(v || "—") },
        { field: "caseNo", header: "Case No", renderCell: v => String(v || "—") },
        { field: "hearingType", header: "Type", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
