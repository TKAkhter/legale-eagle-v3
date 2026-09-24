import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="OneDrive Matter Finder"
      description="Locate OneDrive folders linked to matters"
      queryKey={["reports", "onedrive"]}
      queryFn={p => reportsApi.getOnedriveReport(p)}
      filters={{"showMatter":true,"showClient":true}}
      columns={[
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "folderName", header: "Folder", renderCell: v => String(v || "—") },
        { field: "path", header: "Path", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
