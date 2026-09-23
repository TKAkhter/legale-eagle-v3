import { useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Box, Button, Chip, LinearProgress, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export default function TaskTemplateDetailPage() {
  const { templateId = "" } = useParams()
  const navigate = useNavigate()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["task-templates", "full", templateId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "1", title: "Conflict check", priority: "High", order: 1 },
          { id: "2", title: "Open matter checklist", priority: "Normal", order: 2 },
          { id: "3", title: "Send engagement letter", priority: "Normal", order: 3 },
        ]
      }
      const r = await axiosClient.get("/api/task/get/template/full", { params: { taskUUId: templateId } })
      const d = r.data?.data ?? r.data
      return Array.isArray(d) ? d : []
    },
    enabled: !!templateId,
  })

  const sorted = useMemo(
    () => [...(tasks as Record<string, unknown>[])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [tasks],
  )

  return (
    <PageShell
      title="Task Template"
      description={`Template ${templateId}`}
      breadcrumbs={[
        { label: "Task Templates", path: "/tasks/templates" },
        { label: templateId },
      ]}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/tasks/templates")}>Back</Button>
          <Button variant="contained" onClick={() => navigate("/tasks?assignTemplate=1")}>Assign</Button>
        </Box>
      )}
    >
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {sorted.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No tasks in this template.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["#", "Task", "Priority"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {sorted.map((t, i) => (
                <Box component="tr" key={String(t.id ?? i)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{i + 1}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(t.title ?? t.taskName ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={String(t.priority ?? "Normal")} variant="outlined" />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </PageShell>
  )
}
