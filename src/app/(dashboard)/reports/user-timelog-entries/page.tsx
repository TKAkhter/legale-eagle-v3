import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="User Timelog Entries"
      description="Activity statistics by fee earner"
      queryKey={["reports", "user-timelog-entries"]}
      queryFn={p => reportsApi.getUserTimelogEntries(p)}
      emailExcelFn={f => reportsApi.requestUserTimelogEntriesExcel(f)}
      filters={{"showUser":true,"showDepartment":true,"showDateRange":true}}
      columns={[
        { field: "userName", header: "User", renderCell: v => String(v || "—") },
        { field: "totalHours", header: "Hours", align: "right", renderCell: v => String(v ?? "—") },
        { field: "billableHours", header: "Billable", align: "right", renderCell: v => String(v ?? "—") },
        { field: "nonBillableHours", header: "Non-billable", align: "right", renderCell: v => String(v ?? "—") },
        { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
