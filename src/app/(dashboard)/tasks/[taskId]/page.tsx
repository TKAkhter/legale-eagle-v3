import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Paper, Chip, Typography, Button } from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { SubTaskFormDrawer } from "../_components/SubTaskFormDrawer"
import { tasksApi } from "@/api/tasks"
import { formatDate } from "@lib/utils/formatDate"
import { tasks as staticTasks } from "@/data/static"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const qc = useQueryClient()
  const [completing, setCompleting] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const [editSub, setEditSub] = useState<Record<string, unknown> | null>(null)

  const { data: task, isLoading } = useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        logger.debug("TaskDetail", `Static task: ${taskId}`)
        const found = (staticTasks as Record<string, unknown>[]).find(t => t.id === taskId) ?? staticTasks[0]
        return {
          ...found,
          subTasks: [
            { id: "st1", title: "Gather documents", taskStatus: "Pending", priority: "Normal", taskDeadLine: "2026-09-20" },
            { id: "st2", title: "Draft outline", taskStatus: "Completed", priority: "High", taskDeadLine: "2026-09-18" },
          ],
          history: [
            { id: "h1", action: "Created", userName: "Admin", createdAt: "2026-09-01T10:00:00" },
            { id: "h2", action: "Assigned", userName: "Sarah Johnson", createdAt: "2026-09-02T11:00:00" },
          ],
        }
      }
      return tasksApi.getById(taskId!)
    },
    enabled: !!taskId,
  })

  async function markComplete() {
    setCompleting(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/task/complete", null, { params: { taskId } })
      } else {
        await new Promise(r => setTimeout(r, 400))
      }
      qc.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
      toast.success("Task marked as complete")
    } catch { toast.error("Failed to update task") }
    finally { setCompleting(false) }
  }

  if (isLoading) return <PageShell title="Task"><DetailSkeleton /></PageShell>

  const t = task as Record<string, unknown>
  const assignedTo = t?.assignedTo as { firstName?: string; lastName?: string } | null
  const matter = t?.matter as { title?: string } | null
  const isDone = String(t?.taskStatus ?? "").toLowerCase() === "completed"
  const subTasks = (Array.isArray(t?.subTasks) ? t.subTasks : []) as Record<string, unknown>[]
  const history = (Array.isArray(t?.history) ? t.history
    : Array.isArray(t?.logs) ? t.logs
    : Array.isArray(t?.taskHistory) ? t.taskHistory
    : []) as Record<string, unknown>[]

  return (
    <PageShell
      title={String(t?.taskName ?? t?.title ?? "Task")}
      breadcrumbs={[{ label: "Tasks", path: "/tasks" }, { label: String(t?.taskName ?? t?.title ?? "Detail") }]}
      action={
        !isDone ? (
          <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
            onClick={markComplete} disabled={completing}>
            {completing ? "Updating…" : "Mark Complete"}
          </Button>
        ) : undefined
      }
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <StatusBadge status={String(t?.taskStatus ?? "")} />
          <Chip size="small" label={String(t?.taskType ?? t?.eventType ?? "Task")} variant="outlined" />
          <Chip size="small" label={`Priority: ${String(t?.priority ?? "Normal")}`}
            color={String(t?.priority) === "High" ? "error" : "default"} variant="outlined" />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <InfoRow label="Assigned To" value={assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : "—"} />
          <InfoRow label="Matter" value={matter?.title ?? "—"} />
          <InfoRow label="Deadline" value={t?.taskDeadLine ? formatDate(String(t.taskDeadLine)) : "—"} />
          <InfoRow label="Task Type" value={String(t?.taskType ?? t?.eventType ?? "—")} />
        </Box>
        {!!t?.taskDescription && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.7 }} color="text.secondary">
              {String(t.taskDescription)}
            </Typography>
          </Box>
        )}
      </Paper>

      <Tabs tabs={[
        {
          label: `Sub-tasks (${subTasks.length})`,
          content: (
            <Box>
              <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditSub(null); setSubOpen(true) }}>
                  Add Sub-task
                </Button>
              </Box>
              {!subTasks.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No sub-tasks</Typography>
              )}
              {subTasks.map((s, i) => (
                <Paper key={String(s.id ?? i)} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{String(s.title ?? s.taskName ?? `Step ${i + 1}`)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.taskDeadLine ? formatDate(String(s.taskDeadLine)) : "No deadline"}
                      {s.priority ? ` · ${String(s.priority)}` : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <StatusBadge status={String(s.taskStatus ?? "")} />
                    <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditSub(s); setSubOpen(true) }}>Edit</Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ),
        },
        {
          label: `History (${history.length})`,
          content: (
            <Box sx={{ pt: 1 }}>
              {!history.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No history yet</Typography>
              )}
              {history.map((h, i) => (
                <Box key={String(h.id ?? i)} sx={{ display: "flex", gap: 2, mb: 1.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(h.action ?? h.logType ?? h.title ?? "Update")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {h.userName || h.createdBy ? String(h.userName ?? h.createdBy) : ""}
                      {h.createdAt ? ` · ${formatDate(String(h.createdAt))}` : ""}
                      {h.details || h.note ? ` · ${String(h.details ?? h.note)}` : ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ),
        },
      ]} />

      <SubTaskFormDrawer
        open={subOpen}
        onClose={() => { setSubOpen(false); setEditSub(null) }}
        mainTaskId={String(taskId)}
        subTask={editSub}
        onSuccess={() => {
          setSubOpen(false)
          setEditSub(null)
          qc.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
          toast.success(editSub ? "Sub-task updated" : "Sub-task added")
        }}
      />
    </PageShell>
  )
}
