import { useMemo, useState, type ReactNode } from "react"
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Box, Paper, Chip, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Rating,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SubTaskFormDrawer } from "../_components/SubTaskFormDrawer"
import { TaskFormDrawer } from "../_components/TaskFormDrawer"
import { tasksApi } from "@/api/tasks"
import { adminApi } from "@/api/admin"
import { formatDate } from "@lib/utils/formatDate"
import { tasks as staticTasks } from "@/data/static"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import { buildTaskFolderUrl, clientExternalIdFromTask } from "@/lib/onedrive/taskFolder"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

/** Resolve client uuid for submit/process (LMS contract). */
function clientUuidFromTask(t: Record<string, unknown>): string {
  const taskType = String(t.taskType ?? t.eventType ?? "").toUpperCase()
  const hearingClient = (t.taskTypeInfo as { matter?: { client?: { uuid?: string } } } | undefined)?.matter?.client?.uuid
  const clientMini = (t.clientMini as { uuid?: string } | undefined)?.uuid
  const matterClient = (t.matterMini as { clientMini?: { uuid?: string } } | undefined)?.clientMini?.uuid
    ?? (t.matter as { client?: { uuid?: string } } | undefined)?.client?.uuid
    ?? (t.client as { uuid?: string } | undefined)?.uuid
  if (taskType === "HEARING" && hearingClient) return hearingClient
  if (taskType === "CLIENT" && clientMini) return clientMini
  return String(matterClient ?? clientMini ?? hearingClient ?? t.uuid ?? "")
}

function canSubmitStatus(status: string) {
  return status === "Pending" || status === "Re_Submit"
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [subOpen, setSubOpen] = useState(false)
  const [editSub, setEditSub] = useState<Record<string, unknown> | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitTargetId, setSubmitTargetId] = useState<string>("")
  const [submitTargetLabel, setSubmitTargetLabel] = useState("Task")
  const [submitNote, setSubmitNote] = useState("")
  const [submitFiles, setSubmitFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<"Completed" | "Re_Submit">("Completed")
  const [approvalReason, setApprovalReason] = useState("")
  const [approvalRating, setApprovalRating] = useState<number | null>(0)
  const [approving, setApproving] = useState(false)

  const { data: task, isLoading } = useQuery({
    queryKey: ["tasks", "detail", taskId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        logger.debug("TaskDetail", `Static task: ${taskId}`)
        const found = (staticTasks as Record<string, unknown>[]).find(t => t.id === taskId) ?? staticTasks[0]
        return {
          ...found,
          taskType: "MATTER",
          clientMini: { id: "c1", clientId: "c1", clientExternalId: "CL-1001", uuid: "uuid-c1" },
          matterMini: { id: "m1", title: "Corporate restructuring", clientMini: { clientExternalId: "CL-1001", uuid: "uuid-c1" } },
          subTasks: [
            { id: "st1", title: "Gather documents", taskName: "Gather documents", taskStatus: "Pending", priority: "Normal", taskDeadLine: "2026-09-20", taskType: "MATTER" },
            { id: "st2", title: "Draft outline", taskName: "Draft outline", taskStatus: "Completed", priority: "High", taskDeadLine: "2026-09-18", taskType: "MATTER" },
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

  const companyQ = useQuery({
    queryKey: ["company", "info", "oneDrive"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
  })
  const oneDriveEnabled = Boolean(companyQ.data?.oneDrive)

  const t = (task ?? {}) as Record<string, unknown>
  const status = String(t?.taskStatus ?? "")
  const approvalT = String(t?.approvalT ?? t?.approvalType ?? t?.approvalTaskType ?? "After")
  const forApprovalFlag = searchParams.get("forApproval") === "1" || searchParams.get("forApproval") === "true" || Boolean(t?.forApproval)
  const canSubmit = canSubmitStatus(status)
  const canApprove = forApprovalFlag || (
    (approvalT === "Before" && status === "Waiting_For_Approval")
    || (approvalT === "After" && status === "Submitted")
  )
  const isDone = status.toLowerCase() === "completed"
  const assignedTo = t?.assignedTo as { firstName?: string; lastName?: string } | null
  const matter = t?.matter as { title?: string } | null
  const subTasks = (Array.isArray(t?.subTasks) ? t.subTasks : []) as Record<string, unknown>[]
  const history = (Array.isArray(t?.history) ? t.history
    : Array.isArray(t?.logs) ? t.logs
    : Array.isArray(t?.taskHistory) ? t.taskHistory
    : []) as Record<string, unknown>[]

  const externalId = clientExternalIdFromTask(t)
  const oneDriveUrl = oneDriveEnabled && externalId ? buildTaskFolderUrl(t) : null

  function openSubmit(target: Record<string, unknown>, label: string) {
    setSubmitTargetId(String(target.id ?? taskId ?? ""))
    setSubmitTargetLabel(label)
    setSubmitNote("")
    setSubmitFiles([])
    setSubmitOpen(true)
  }

  const actions = useMemo(() => {
    const nodes: ReactNode[] = []
    if (oneDriveUrl) {
      const isExternal = oneDriveUrl.startsWith("http")
      nodes.push(
        isExternal ? (
          <Button
            key="onedrive"
            variant="outlined"
            startIcon={<CloudOutlinedIcon />}
            component="a"
            href={oneDriveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open OneDrive
          </Button>
        ) : (
          <Button
            key="onedrive"
            variant="outlined"
            startIcon={<CloudOutlinedIcon />}
            component={RouterLink}
            to={oneDriveUrl}
          >
            Open OneDrive
          </Button>
        ),
      )
    }
    if (!isDone) {
      nodes.push(
        <Button key="edit" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
          Edit Task
        </Button>,
      )
      nodes.push(
        <Button key="del" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>,
      )
    }
    if (canSubmit) {
      nodes.push(
        <Button key="submit" variant="contained" color="success" startIcon={<SendIcon />}
          onClick={() => openSubmit({ id: taskId }, "Task")}>
          Submit
        </Button>,
      )
    }
    if (canApprove) {
      nodes.push(
        <Button key="appr" variant="contained" color="success" startIcon={<CheckIcon />}
          onClick={() => { setApprovalStatus("Completed"); setApprovalReason(""); setApprovalRating(0); setApprovalOpen(true) }}>
          Approve
        </Button>,
      )
      nodes.push(
        <Button key="rej" variant="outlined" color="error" startIcon={<CloseIcon />}
          onClick={() => { setApprovalStatus("Re_Submit"); setApprovalReason(""); setApprovalRating(null); setApprovalOpen(true) }}>
          Reject
        </Button>,
      )
    }
    return nodes
  }, [isDone, canSubmit, canApprove, oneDriveUrl, taskId])

  async function handleSubmit() {
    if (!submitNote.trim()) {
      toast.error("Enter remark.")
      return
    }
    const id = submitTargetId || String(taskId)
    setSubmitting(true)
    try {
      toast.success(await tasksApi.submitProcess(id, {
        note: submitNote.trim(),
        uuid: clientUuidFromTask(t),
        files: submitFiles,
      }))
      setSubmitOpen(false)
      qc.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
    } catch {
      toast.error("Failed to submit task")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApproval() {
    if (!approvalReason.trim()) {
      toast.error("Add Remarks.")
      return
    }
    setApproving(true)
    try {
      toast.success(await tasksApi.approveProcess(String(taskId), {
        approvalTaskType: approvalT || "After",
        taskStatus: approvalStatus,
        reason: approvalReason.trim(),
        taskRating: approvalStatus === "Completed" ? (approvalRating ?? 0) : 0,
      }))
      setApprovalOpen(false)
      qc.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
      qc.invalidateQueries({ queryKey: ["tasks", "approval"] })
    } catch {
      toast.error("Approval action failed")
    } finally {
      setApproving(false)
    }
  }

  if (isLoading) return <PageShell title="Task"><DetailSkeleton /></PageShell>

  return (
    <PageShell
      title={String(t?.taskName ?? t?.title ?? "Task")}
      breadcrumbs={[{ label: "Tasks", path: "/tasks" }, { label: String(t?.taskName ?? t?.title ?? "Detail") }]}
      action={actions.length ? <>{actions}</> : undefined}
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <StatusBadge status={status} />
          <Chip size="small" label={String(t?.taskType ?? t?.eventType ?? "Task")} variant="outlined" />
          <Chip size="small" label={`Priority: ${String(t?.priority ?? "Normal")}`}
            color={String(t?.priority) === "High" ? "error" : "default"} variant="outlined" />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <InfoRow label="Assigned To" value={assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : "—"} />
          <InfoRow label="Matter" value={matter?.title ?? String((t?.matterMini as { title?: string } | undefined)?.title ?? "—")} />
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
              {subTasks.map((s, i) => {
                const stStatus = String(s.taskStatus ?? "")
                const stCanSubmit = canSubmitStatus(stStatus)
                return (
                  <Paper key={String(s.id ?? i)} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{String(s.title ?? s.taskName ?? `Step ${i + 1}`)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.taskDeadLine ? formatDate(String(s.taskDeadLine)) : "No deadline"}
                        {s.priority ? ` · ${String(s.priority)}` : ""}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <StatusBadge status={stStatus} />
                      {stCanSubmit && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<SendIcon />}
                          onClick={() => openSubmit(
                            { ...s, clientMini: t.clientMini, matterMini: t.matterMini, taskType: s.taskType ?? t.taskType },
                            "Sub-task",
                          )}
                        >
                          Submit
                        </Button>
                      )}
                      <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditSub(s); setSubOpen(true) }}>Edit</Button>
                    </Box>
                  </Paper>
                )
              })}
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

      <TaskFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        taskId={String(taskId)}
        onSuccess={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["tasks", "detail", taskId] })
          toast.success("Task updated")
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          toast.success(await tasksApi.delete(String(taskId)))
          navigate("/tasks")
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        severity="error"
      />

      <Dialog open={submitOpen} onClose={() => !submitting && setSubmitOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit {submitTargetLabel}</DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={4}
            label="Remarks"
            required
            value={submitNote}
            onChange={e => setSubmitNote(e.target.value)}
            sx={{ mt: 1 }}
            helperText="Required"
          />
          <Button component="label" variant="outlined" size="small" sx={{ mt: 2 }}>
            Attach files (optional)
            <input
              type="file"
              hidden
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={e => setSubmitFiles(Array.from(e.target.files ?? []))}
            />
          </Button>
          {!!submitFiles.length && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              {submitFiles.map(f => f.name).join(", ")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" disabled={submitting || !submitNote.trim()} onClick={() => void handleSubmit()}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={approvalOpen} onClose={() => !approving && setApprovalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Task Approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {approvalStatus === "Completed" ? "Approve" : "Reject"} this task
          </Typography>
          {approvalStatus === "Completed" && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Rate performance</Typography>
              <Rating
                value={approvalRating}
                precision={0.5}
                size="large"
                onChange={(_, v) => setApprovalRating(v)}
              />
            </Box>
          )}
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={4}
            label="Remarks"
            required
            value={approvalReason}
            onChange={e => setApprovalReason(e.target.value)}
            helperText="Required"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalOpen(false)} disabled={approving}>Cancel</Button>
          <Button
            variant="contained"
            color={approvalStatus === "Completed" ? "primary" : "error"}
            disabled={approving || !approvalReason.trim()}
            onClick={() => void handleApproval()}
          >
            {approving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
