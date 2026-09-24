import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { ClientSelectFilter } from "@/components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@/components/filters/MatterSelectFilter"
import { adminApi } from "@/api/admin"
import { miscModulesApi } from "@/api/miscModules"

type TaskType = "CLIENT" | "MATTER"

interface SubTaskDraft {
  title: string
  days: string
  assignPerson: string
  approval: boolean
  afterTaskApprovalPerson: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** When opened from matter/client context (URL `type` / `typeId`). */
  taskType?: TaskType
  taskTypeId?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr || todayIso())
  if (Number.isNaN(d.getTime())) return todayIso()
  d.setDate(d.getDate() + (Number.isFinite(days) ? days : 0))
  return d.toISOString().slice(0, 10)
}

function emptySub(): SubTaskDraft {
  return { title: "", days: "3", assignPerson: "", approval: false, afterTaskApprovalPerson: "" }
}

export function MultiStepTaskFormDrawer({ open, onClose, onSuccess, taskType: propType, taskTypeId: propTypeId }: Props) {
  const lockedType = propType === "CLIENT" || propType === "MATTER" ? propType : undefined
  const lockedTypeId = propTypeId?.trim() || undefined

  const [taskName, setTaskName] = useState("")
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState(todayIso())
  const [taskDeadLine, setTaskDeadLine] = useState(plusDaysIso(3))
  const [assignPerson, setAssignPerson] = useState("")
  const [taskType, setTaskType] = useState<TaskType>(lockedType ?? "MATTER")
  const [taskTypeId, setTaskTypeId] = useState(lockedTypeId ?? "")
  const [needApproval, setNeedApproval] = useState(false)
  const [afterGroup, setAfterGroup] = useState("")
  const [afterTaskApprovalPerson, setAfterTaskApprovalPerson] = useState("")
  const [subTasks, setSubTasks] = useState<SubTaskDraft[]>([emptySub()])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQuery = useQuery({
    queryKey: ["users", "min", "multi-step"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })
  const groupsQuery = useQuery({
    queryKey: ["groups", "multi-step"],
    enabled: open && needApproval,
    queryFn: () => adminApi.getGroups(),
  })

  useEffect(() => {
    if (!open) return
    setTaskName("")
    setTitle("")
    setStartDate(todayIso())
    setTaskDeadLine(plusDaysIso(3))
    setAssignPerson("")
    setTaskType(lockedType ?? "MATTER")
    setTaskTypeId(lockedTypeId ?? "")
    setNeedApproval(false)
    setAfterGroup("")
    setAfterTaskApprovalPerson("")
    setSubTasks([emptySub()])
    setError("")
  }, [open, lockedType, lockedTypeId])

  const users = (usersQuery.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]
  const groups = (groupsQuery.data ?? []) as { id?: string; name?: string }[]

  const userLabel = (u: { id?: string; firstName?: string; lastName?: string }) =>
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id ?? "")

  const resolvedType = lockedType ?? taskType
  const resolvedTypeId = lockedTypeId ?? taskTypeId

  const builtSubs = useMemo(() => {
    let cursorStart = startDate || todayIso()
    return subTasks.map(s => {
      const days = Math.max(0, parseInt(s.days, 10) || 0)
      const deadline = addDays(cursorStart, days)
      const row = {
        title: s.title.trim(),
        days,
        startDate: cursorStart,
        taskDeadLine: deadline,
        assignPerson: s.assignPerson,
        approval: s.approval,
        approvalType: s.approval ? "After" : "",
        afterTaskApproval: s.approval,
        afterTaskApprovalPerson: s.approval ? s.afterTaskApprovalPerson : "",
        afterGroup: "",
        afterApprovalCompleted: false,
        beforeApprovalCompleted: false,
        beforeGroup: "",
        beforeTaskApproval: false,
        beforeTaskApprovalPerson: "",
        assignTask: true,
        document: [] as unknown[],
        note: "",
        priority: 2,
        subTask: false,
        subTasks: [] as unknown[],
        userGroupId: "",
        taskType: resolvedType,
        taskTypeId: resolvedTypeId,
        taskApprovalType: "MultiLevel",
      }
      cursorStart = deadline
      return row
    })
  }, [subTasks, startDate, resolvedType, resolvedTypeId])

  async function submit() {
    if (!taskName.trim() || !title.trim()) { setError("Task name and description are required"); return }
    if (!taskDeadLine) { setError("Deadline is required"); return }
    if (!assignPerson) { setError("Assignee is required"); return }
    if (!resolvedTypeId) { setError("Select a client or matter"); return }
    if (needApproval && !afterTaskApprovalPerson) { setError("Approval person is required"); return }

    const validSubs = builtSubs.filter(s => s.title)
    if (!validSubs.length) { setError("Add at least one sub-task"); return }
    for (const [i, s] of validSubs.entries()) {
      if (!s.assignPerson) { setError(`Step ${i + 1}: assignee is required`); return }
      if (!s.days && s.days !== 0) { setError(`Step ${i + 1}: days to complete is required`); return }
      if (s.approval && !s.afterTaskApprovalPerson) { setError(`Step ${i + 1}: approval person is required`); return }
    }

    setSaving(true)
    setError("")
    try {
      const payload: Record<string, unknown> = {
        taskName: taskName.trim(),
        title: title.trim(),
        startDate: startDate || todayIso(),
        taskDeadLine,
        assignPerson,
        assignTask: true,
        taskType: resolvedType,
        taskTypeId: resolvedTypeId,
        taskApprovalType: "MultiLevel",
        priority: "2",
        subTask: true,
        subTasks: validSubs.map(({ days: _d, ...rest }) => rest),
        approval: needApproval,
        approvalType: needApproval ? "After" : "",
        afterTaskApproval: needApproval,
        afterGroup: needApproval ? afterGroup : "",
        afterTaskApprovalPerson: needApproval ? afterTaskApprovalPerson : "",
        afterApprovalCompleted: false,
        beforeApprovalCompleted: false,
        beforeGroup: "",
        beforeTaskApproval: false,
        beforeTaskApprovalPerson: "",
        document: [],
        note: "",
        userGroupId: "",
      }
      await miscModulesApi.createMultiStepTask(payload)
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create multi-step task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="New Multi-Step Task"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Create"
      width={640}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {!lockedType && (
          <FormControl size="small" fullWidth>
            <InputLabel>Related To</InputLabel>
            <Select
              label="Related To"
              value={taskType}
              onChange={e => {
                setTaskType(e.target.value as TaskType)
                setTaskTypeId("")
              }}
            >
              <MenuItem value="MATTER">Matter</MenuItem>
              <MenuItem value="CLIENT">Client</MenuItem>
            </Select>
          </FormControl>
        )}
        {!lockedTypeId && (
          resolvedType === "CLIENT"
            ? <ClientSelectFilter value={taskTypeId || undefined} onChange={v => setTaskTypeId(v ?? "")} label="Client *" />
            : <MatterSelectFilter value={taskTypeId || undefined} onChange={v => setTaskTypeId(v ?? "")} label="Matter *" />
        )}

        <TextField size="small" label="Task Name" required value={taskName} onChange={e => setTaskName(e.target.value)} />
        <TextField size="small" label="Task Description" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField size="small" label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Deadline" type="date" required value={taskDeadLine} onChange={e => setTaskDeadLine(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />

        <FormControl size="small" fullWidth required>
          <InputLabel>Assign To</InputLabel>
          <Select label="Assign To" value={assignPerson} onChange={e => setAssignPerson(e.target.value)}>
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>{userLabel(u)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Need Approval?</FormLabel>
          <RadioGroup
            row
            value={needApproval ? "yes" : "no"}
            onChange={e => {
              const yes = e.target.value === "yes"
              setNeedApproval(yes)
              if (!yes) {
                setAfterGroup("")
                setAfterTaskApprovalPerson("")
              }
            }}
          >
            <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </FormControl>

        {needApproval && (
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
              <InputLabel>Approval Group</InputLabel>
              <Select label="Approval Group" value={afterGroup} onChange={e => setAfterGroup(e.target.value)}>
                <MenuItem value=""><em>None</em></MenuItem>
                {groups.map(g => (
                  <MenuItem key={String(g.id)} value={String(g.id)}>{g.name ?? g.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180, flex: 1 }} required>
              <InputLabel>Approval Person</InputLabel>
              <Select
                label="Approval Person"
                value={afterTaskApprovalPerson}
                onChange={e => setAfterTaskApprovalPerson(e.target.value)}
              >
                {users.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>{userLabel(u)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Sub-tasks</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setSubTasks(s => [...s, emptySub()])}>
            Add step
          </Button>
        </Box>

        {subTasks.map((step, i) => (
          <Box
            key={i}
            sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap", p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
          >
            <TextField
              size="small"
              label={`Step ${i + 1} description`}
              required
              value={step.title}
              onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
              sx={{ flex: 1, minWidth: 160 }}
            />
            <TextField
              size="small"
              label="Days To Complete"
              type="number"
              required
              value={step.days}
              onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, days: e.target.value } : s))}
              slotProps={{ htmlInput: { min: 0 } }}
              sx={{ width: 140 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }} required>
              <InputLabel>Assign To</InputLabel>
              <Select
                label="Assign To"
                value={step.assignPerson}
                onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, assignPerson: e.target.value } : s))}
              >
                {users.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>{userLabel(u)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel sx={{ fontSize: 12 }}>Need Approval?</FormLabel>
              <RadioGroup
                row
                value={step.approval ? "yes" : "no"}
                onChange={e => {
                  const yes = e.target.value === "yes"
                  setSubTasks(arr => arr.map((s, j) => j === i
                    ? { ...s, approval: yes, afterTaskApprovalPerson: yes ? s.afterTaskApprovalPerson : "" }
                    : s))
                }}
              >
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              </RadioGroup>
            </FormControl>
            {step.approval && (
              <FormControl size="small" sx={{ minWidth: 160 }} required>
                <InputLabel>Approval Person</InputLabel>
                <Select
                  label="Approval Person"
                  value={step.afterTaskApprovalPerson}
                  onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, afterTaskApprovalPerson: e.target.value } : s))}
                >
                  {users.map(u => (
                    <MenuItem key={String(u.id)} value={String(u.id)}>{userLabel(u)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <IconButton size="small" disabled={subTasks.length <= 1} onClick={() => setSubTasks(arr => arr.filter((_, j) => j !== i))} aria-label="Remove step">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </FormDrawer>
  )
}
