/**
 * TaskKanban.tsx — Kanban board view for tasks.
 *
 * Three columns: Pending | In Progress | Completed
 * Drag-and-drop between columns updates task status.
 *
 * Static mode: reads from static tasks, updates optimistically in state.
 * Live mode:   calls /api/task/update-status on drop.
 */
import { useState } from "react"
import { Box, Paper, Typography, Chip, Avatar, Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { toast } from "@/lib/toast"
import { formatDate } from "@lib/utils/formatDate"

type TaskStatus = "Pending" | "In_Progress" | "Completed"

interface KanbanTask {
  id:            string
  taskName:      string
  priority:      string
  taskStatus:    string
  taskDeadLine?: string
  assignedTo?:   { firstName?: string; lastName?: string }
  matter?:       { title?: string }
}

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: "Pending",     label: "Pending",     color: "#D97706", bg: "#FEF3C7" },
  { id: "In_Progress", label: "In Progress", color: "#2563EB", bg: "#DBEAFE" },
  { id: "Completed",   label: "Completed",   color: "#059669", bg: "#D1FAE5" },
]

const PRIORITY_COLOR: Record<string, "error"|"warning"|"default"> = {
  High:   "error",
  Normal: "warning",
  Low:    "default",
}

interface Props {
  tasks:         KanbanTask[]
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onAddTask?:    () => void
}

export function TaskKanban({ tasks: initialTasks, onStatusChange, onAddTask }: Props) {
  const [tasks,       setTasks]       = useState(initialTasks)
  const [draggingId,  setDraggingId]  = useState<string|null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus|null>(null)

  const byStatus = (status: TaskStatus) => tasks.filter(t =>
    t.taskStatus === status ||
    (status === "In_Progress" && t.taskStatus === "In_Progress")
  )

  async function handleDrop(newStatus: TaskStatus) {
    if (!draggingId || draggingId === null) return
    const task = tasks.find(t => t.id === draggingId)
    if (!task || task.taskStatus === newStatus) { setDraggingId(null); setDragOverCol(null); return }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggingId ? { ...t, taskStatus: newStatus } : t))
    setDraggingId(null); setDragOverCol(null)

    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.patch(`/api/task/status`, { taskId: draggingId, taskStatus: newStatus })
      }
      onStatusChange?.(draggingId, newStatus)
      toast.success(`Task moved to ${newStatus.replace("_"," ")}`)
    } catch {
      // Rollback
      setTasks(prev => prev.map(t => t.id === draggingId ? { ...t, taskStatus: task.taskStatus } : t))
      toast.error("Failed to update task status")
    }
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, minHeight: 400 }}>
      {COLUMNS.map(col => {
        const colTasks = byStatus(col.id)
        const isDragOver = dragOverCol === col.id
        return (
          <Box
            key={col.id}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.id)}
            sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {/* Column header */}
            <Box sx={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              px: 1.5, py: 1,
              borderRadius: 1.5,
              bgcolor: isDragOver ? col.bg : "action.hover",
              border: isDragOver ? `2px dashed ${col.color}` : "2px solid transparent",
              transition: "all 150ms",
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: col.color }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{col.label}</Typography>
              </Box>
              <Chip size="small" label={colTasks.length} sx={{ height: 20, fontSize: 11, bgcolor: col.bg, color: col.color }} />
            </Box>

            {/* Task cards */}
            {colTasks.map(task => {
              const initials = `${task.assignedTo?.firstName?.[0] ?? ""}${task.assignedTo?.lastName?.[0] ?? ""}`.toUpperCase()
              const isOverdue = task.taskDeadLine && new Date(task.taskDeadLine) < new Date() && task.taskStatus !== "Completed"
              return (
                <Paper
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    cursor: "grab",
                    opacity: draggingId === task.id ? 0.5 : 1,
                    transition: "opacity 150ms, box-shadow 150ms",
                    "&:hover": { boxShadow: 2 },
                    "&:active": { cursor: "grabbing" },
                    borderLeft: `3px solid ${col.color}`,
                  }}
                >
                  {/* Task name */}
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
                    {task.taskName}
                  </Typography>

                  {/* Matter */}
                  {task.matter?.title && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 0.75 }}>
                      {task.matter.title}
                    </Typography>
                  )}

                  {/* Footer: priority + due date + avatar */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      <Chip
                        size="small"
                        label={task.priority}
                        color={PRIORITY_COLOR[task.priority] ?? "default"}
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, "& .MuiChip-label": { px: 0.75 } }}
                      />
                      {task.taskDeadLine && (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 10, color: isOverdue ? "error.main" : "text.disabled" }}
                        >
                          {formatDate(task.taskDeadLine)}
                        </Typography>
                      )}
                    </Box>
                    {initials && (
                      <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: "secondary.main" }}>
                        {initials}
                      </Avatar>
                    )}
                  </Box>
                </Paper>
              )
            })}

            {/* Drop zone hint when dragging */}
            {draggingId && dragOverCol !== col.id && (
              <Box sx={{
                border: `2px dashed`, borderColor: "divider",
                borderRadius: 2, p: 2, textAlign: "center",
              }}>
                <Typography variant="caption" color="text.disabled">Drop here</Typography>
              </Box>
            )}

            {/* Add task button */}
            {col.id === "Pending" && onAddTask && (
              <Button
                size="small" startIcon={<AddIcon />}
                onClick={onAddTask}
                sx={{ borderRadius: 1.5, justifyContent: "flex-start", color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }}
              >
                Add task
              </Button>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
