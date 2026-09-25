/**
 * Hearing Tasks tab — Assigned / Self / Approval filters matching LMS.
 * Uses distinct task endpoints (not client-only filtering).
 */
import { useState } from "react"
import { Box, Tab, Tabs } from "@mui/material"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { hearingsApi } from "@/api/hearings"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

type TaskFilter = "ASSIGNED" | "SELF" | "APPROVAL"
type ApprovalPhase = "pre" | "post"

const FILTER_TABS: { value: TaskFilter; label: string }[] = [
  { value: "ASSIGNED", label: "Assigned" },
  { value: "SELF", label: "Self Tasks" },
  { value: "APPROVAL", label: "Approval" },
]

export function HearingTasksPanel({ hearingId }: { hearingId: string }) {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("ASSIGNED")
  const [approvalPhase, setApprovalPhase] = useState<ApprovalPhase>("pre")

  return (
    <Box>
      <Tabs
        value={taskFilter}
        onChange={(_, v: TaskFilter) => setTaskFilter(v)}
        textColor="secondary"
        indicatorColor="secondary"
        sx={{ minHeight: 40, mb: taskFilter === "APPROVAL" ? 0 : 1.5 }}
      >
        {FILTER_TABS.map(t => (
          <Tab key={t.value} value={t.value} label={t.label} sx={{ minHeight: 40, textTransform: "none", fontWeight: 600 }} />
        ))}
      </Tabs>
      {taskFilter === "APPROVAL" && (
        <Tabs
          value={approvalPhase}
          onChange={(_, v: ApprovalPhase) => setApprovalPhase(v)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ minHeight: 36, mb: 1.5 }}
        >
          <Tab value="pre" label="Pre-Submission" sx={{ minHeight: 36, textTransform: "none" }} />
          <Tab value="post" label="Post-Submission" sx={{ minHeight: 36, textTransform: "none" }} />
        </Tabs>
      )}
      <DataGrid
        columns={[
          { field: "taskName", header: "Task", renderCell: (v, row) => String(v ?? (row as { title?: string; name?: string }).title ?? (row as { name?: string }).name ?? "—") },
          { field: "taskStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "priority", header: "Priority", renderCell: v => String(v ?? "—") },
          { field: "taskDeadLine", header: "Deadline", renderCell: v => (v ? formatDate(String(v)) : "—") },
        ]}
        queryKey={["hearings", "tasks", hearingId, taskFilter, approvalPhase]}
        queryFn={(p: GridParams) => hearingsApi.getTasks(hearingId, {
          ...p,
          filters: { ...p.filters, taskFilter, approvalPhase },
        })}
        detailPath={row => {
          const id = String((row as { id?: string }).id ?? "")
          if (!id) return "/tasks"
          const qs = taskFilter === "APPROVAL" ? "?forApproval=1" : ""
          return `/tasks/${id}${qs}`
        }}
        zebraStriping
      />
    </Box>
  )
}
