import { useState } from "react"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { miscModulesApi } from "@/api/miscModules"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showDateRange: true })

export default function DepartmentActivityApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  async function handleApprove(row: Record<string, unknown>, approve: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/activity/approve", {
          activityIds: [row.id],
          status: approve ? "Approved" : "Rejected",
        })
      }
      toast.success(approve ? "Activity approved" : "Activity rejected")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["approvals", "department-activity"] })
    } catch {
      toast.error("Action failed")
    }
  }

  return (
    <PageShell title="Department Activity Approvals" description="Activities pending secretary / department review">
      <DataGrid
        key={gridKey}
        columns={[
          { field: "activityName", header: "Activity", renderCell: (v, row) => String(v ?? (row as { activity?: string }).activity ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
          { field: "userName", header: "User", renderCell: v => String(v || "—") },
          { field: "hours", header: "Hours", align: "right", renderCell: (v, row) => String(v ?? (row as { totalHours?: number }).totalHours ?? "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "Pending")} /> },
        ]}
        queryKey={["approvals", "department-activity"]}
        queryFn={(p: GridParams) => miscModulesApi.getDepartmentActivityApprovals(p)}
        FilterPanel={FilterPanel}
        hasFilters
        rowMenuItems={row => [
          { label: "Approve", icon: <CheckIcon fontSize="small" />, onClick: () => handleApprove(row, true) },
          { label: "Reject", icon: <CloseIcon fontSize="small" />, color: "error", onClick: () => handleApprove(row, false) },
        ]}
      />
    </PageShell>
  )
}
