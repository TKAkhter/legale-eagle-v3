import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Button } from "@mui/material"
import CheckIcon from "@mui/icons-material/Check"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true, showDateRange: true, showUser: true })

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function approvalId(row: Record<string, unknown>): string {
  return String(row.activityApprovalId ?? row.id ?? "")
}

/** HOD pending hourly timelog queue (LMS /pending-approval-timelogs). */
export default function TimelogsPendingPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  async function approveRows(rows: Record<string, unknown>[]) {
    try {
      const items = rows.map(r => ({
        activityApprovalId: approvalId(r),
        revenueStatus: "COMPLETED",
        rejectedReason: "",
      }))
      toast.success(await timelogsApi.approve(items))
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["timelogs", "pending"] })
    } catch {
      toast.error("Approval failed")
    }
  }

  return (
    <PageShell title="Pending Timelog Approvals" description="HOD queue for hourly time entries awaiting approval">
      <DataGrid
        key={gridKey}
        columns={[
          { field: "entryDate", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "activity", header: "Activity", renderCell: (v, row) => String(v ?? (row as { activityName?: string }).activityName ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: (v, row) => String(v ?? (row as { matter?: { title?: string } }).matter?.title ?? "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => String(v ?? (row as { client?: { companyName?: string } }).client?.companyName ?? "—") },
          {
            field: "totalHours",
            header: "Hours",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              if (r.totalHours != null) return Number(r.totalHours).toFixed(2)
              const h = Number(r.hours ?? 0)
              const m = Number(r.minutes ?? 0)
              return h || m ? `${h}:${String(m).padStart(2, "0")}` : "0"
            },
          },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "responsiblePerson", header: "User", renderCell: v => personName(v) },
          { field: "revenueStatus", header: "Status", renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { status?: string }).status ?? "Pending")} /> },
        ]}
        queryKey={["timelogs", "pending"]}
        queryFn={(p: GridParams) => timelogsApi.getPendingApproval(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        hasRowSelection
        bulkActions={[
          {
            label: "Approve selected",
            icon: <CheckIcon fontSize="small" />,
            onClick: rows => void approveRows(rows as Record<string, unknown>[]),
          },
        ]}
        rowMenuItems={row => [
          {
            label: "Approve",
            icon: <CheckIcon fontSize="small" />,
            onClick: () => void approveRows([row as Record<string, unknown>]),
          },
        ]}
      />
    </PageShell>
  )
}
