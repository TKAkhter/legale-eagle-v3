import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Paper, Chip, Typography, Button } from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { formatDate } from "@lib/utils/formatDate"
import { tasks as staticTasks } from "@/data/static"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb:1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight:500,mt:0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const qc = useQueryClient()
  const [completing, setCompleting] = useState(false)

  const { data: task, isLoading } = useQuery({
    queryKey: ["tasks","detail",taskId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        logger.debug("TaskDetail", `Static task: ${taskId}`)
        return (staticTasks as Record<string,unknown>[]).find(t => t.id === taskId) ?? staticTasks[0]
      }
      const r = await axiosClient.get("/api/task/get/full/task", { params: { taskId } })
      return r.data?.data ?? r.data
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
      qc.invalidateQueries({ queryKey: ["tasks","detail",taskId] })
      toast.success("Task marked as complete")
    } catch { toast.error("Failed to update task") }
    finally { setCompleting(false) }
  }

  if (isLoading) return <PageShell title="Task"><DetailSkeleton /></PageShell>

  const t = task as Record<string,unknown>
  const assignedTo = t?.assignedTo as { firstName?:string; lastName?:string } | null
  const matter = t?.matter as { title?:string } | null
  const isDone = String(t?.taskStatus ?? "").toLowerCase() === "completed"

  return (
    <PageShell
      title={String(t?.taskName ?? "Task")}
      breadcrumbs={[{label:"Tasks",path:"/tasks"},{label:String(t?.taskName ?? "Detail")}]}
      action={
        !isDone ? (
          <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
            onClick={markComplete} disabled={completing}>
            {completing ? "Updating…" : "Mark Complete"}
          </Button>
        ) : undefined
      }
    >
      <Paper variant="outlined" sx={{ p:3, borderRadius:2, mb:3 }}>
        <Box sx={{ display:"flex", gap:1, mb:2, flexWrap:"wrap" }}>
          <StatusBadge status={String(t?.taskStatus ?? "")} />
          <Chip size="small" label={String(t?.taskType ?? t?.eventType ?? "Task")} variant="outlined" />
          <Chip size="small" label={`Priority: ${String(t?.priority ?? "Normal")}`}
            color={String(t?.priority) === "High" ? "error" : "default"} variant="outlined" />
        </Box>
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"1fr 1fr" }, gap:2 }}>
          <InfoRow label="Assigned To"  value={assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : "—"} />
          <InfoRow label="Matter"       value={matter?.title ?? "—"} />
          <InfoRow label="Deadline"     value={t?.taskDeadLine ? formatDate(String(t.taskDeadLine)) : "—"} />
          <InfoRow label="Task Type"    value={String(t?.taskType ?? t?.eventType ?? "—")} />
        </Box>
        {!!t?.taskDescription && (
          <Box sx={{ mt:2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>Description</Typography>
            <Typography variant="body2" sx={{ mt:0.5, lineHeight:1.7 }} color="text.secondary">
              {String(t.taskDescription)}
            </Typography>
          </Box>
        )}
      </Paper>
    </PageShell>
  )
}
