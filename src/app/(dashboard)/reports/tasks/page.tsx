import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function TasksReportPage() {
  return (
    <SimpleReportPage
      title="Tasks Report"
      description="Task status, priority, and assignment"
      queryKey={["reports", "tasks"]}
      queryFn={p => reportsApi.getTasksReport(p)}
      filters={{ showClient: true, showUser: true, showDateRange: true }}
      columns={[
        { field: "taskName", header: "Task", sortKey: "taskName", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
        { field: "taskStatus", header: "Status", renderCell: v => String(v || "—") },
        { field: "priority", header: "Priority", renderCell: v => String(v || "—") },
        { field: "assignedTo", header: "Assigned To", renderCell: (v, row) => String(v ?? (row as { assigneeName?: string }).assigneeName ?? "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "dueDate", header: "Due Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
