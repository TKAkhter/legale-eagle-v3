import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, MenuItem, Paper, TextField, Typography,
} from "@mui/material"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { tasksApi } from "@/api/tasks"
import { toast } from "@/lib/toast"

const PRIORITY_LABEL: Record<string, string> = {
  "0": "Low",
  "1": "Normal",
  "2": "High",
  Low: "Low",
  Normal: "Normal",
  High: "High",
}

export default function TaskTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editPriority, setEditPriority] = useState("1")
  const [saving, setSaving] = useState(false)

  const { data: parents = [] } = useQuery({
    queryKey: ["task-templates", "parent"],
    queryFn: () => tasksApi.getTemplateParents(),
  })

  const title = useMemo(() => {
    const list = parents as Record<string, unknown>[]
    const found = list.find(t => String(t.taskUUId ?? t.id) === templateId)
    return String(found?.templateTitle ?? "Task Template")
  }, [parents, templateId])

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["task-templates", "full", templateId],
    queryFn: () => tasksApi.getTemplateFull(String(templateId)),
    enabled: !!templateId,
  })

  const rows = (tasks as Record<string, unknown>[]).slice().sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
  )

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= rows.length) return
    const reordered = [...rows]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    const payload = reordered.map((t, i) => ({ ...t, order: i }))
    try {
      await tasksApi.reorderTemplateTasks(String(templateId), payload)
      toast.success("Order updated")
      qc.invalidateQueries({ queryKey: ["task-templates", "full", templateId] })
      refetch()
    } catch {
      toast.error("Failed to update order")
    }
  }

  function openEdit(row: Record<string, unknown>) {
    setEditRow(row)
    setEditTitle(String(row.title ?? ""))
    setEditPriority(String(row.priority ?? "1"))
  }

  async function saveEdit() {
    if (!editRow) return
    setSaving(true)
    try {
      await tasksApi.updateTemplateTask(String(editRow.id), {
        id: editRow.id,
        title: editTitle.trim(),
        priority: editPriority,
      })
      toast.success("Task updated")
      setEditRow(null)
      refetch()
    } catch {
      toast.error("Failed to update task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title={title}
      description="Template task checklist"
      breadcrumbs={[
        { label: "Tasks", path: "/tasks" },
        { label: "Templates", path: "/tasks/templates" },
        { label: title },
      ]}
      action={<Button variant="outlined" onClick={() => navigate("/tasks/templates")}>Back to list</Button>}
    >
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {rows.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No tasks in this template.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["#", "Title", "Priority", "Actions"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map((row, index) => (
                <Box component="tr" key={String(row.id)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, color: "text.secondary" }}>{index + 1}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 500 }}>{String(row.title ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={PRIORITY_LABEL[String(row.priority)] ?? String(row.priority ?? "—")} variant="outlined" />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(row)}>Edit</Button>
                    <Button size="small" disabled={index === 0} onClick={() => move(index, -1)} startIcon={<ArrowUpwardIcon />}>Up</Button>
                    <Button size="small" disabled={index === rows.length - 1} onClick={() => move(index, 1)} startIcon={<ArrowDownwardIcon />}>Down</Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={!!editRow} onClose={() => setEditRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Template Task</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Title" value={editTitle} onChange={e => setEditTitle(e.target.value)} fullWidth size="small" />
          <TextField select label="Priority" value={editPriority} onChange={e => setEditPriority(e.target.value)} fullWidth size="small">
            <MenuItem value="0">Low</MenuItem>
            <MenuItem value="1">Normal</MenuItem>
            <MenuItem value="2">High</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !editTitle.trim()} onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
