import { useEffect, useState } from "react"
import { Alert, Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { miscModulesApi } from "@/api/miscModules"

interface SubTask {
  title: string
  taskDeadLine: string
  assignPerson: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function MultiStepTaskFormDrawer({ open, onClose, onSuccess }: Props) {
  const [taskName, setTaskName] = useState("")
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [taskDeadLine, setTaskDeadLine] = useState("")
  const [assignPerson, setAssignPerson] = useState("")
  const [subTasks, setSubTasks] = useState<SubTask[]>([{ title: "", taskDeadLine: "", assignPerson: "" }])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQuery = useQuery({
    queryKey: ["users", "min", "multi-step"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  useEffect(() => {
    if (!open) return
    setTaskName("")
    setTitle("")
    setStartDate("")
    setTaskDeadLine("")
    setAssignPerson("")
    setSubTasks([{ title: "", taskDeadLine: "", assignPerson: "" }])
    setError("")
  }, [open])

  async function submit() {
    if (!taskName.trim() || !title.trim()) { setError("Task name and title are required"); return }
    if (!taskDeadLine) { setError("Deadline is required"); return }
    if (!assignPerson) { setError("Assignee is required"); return }
    const validSubs = subTasks.filter(s => s.title.trim())
    if (!validSubs.length) { setError("Add at least one sub-task"); return }
    setSaving(true)
    setError("")
    try {
      await miscModulesApi.createMultiStepTask({
        taskName,
        title,
        startDate: startDate || undefined,
        taskDeadLine,
        assignPerson,
        subTasks: validSubs,
        taskType: "MULTI_STEP",
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create multi-step task")
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQuery.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]

  return (
    <FormDrawer open={open} onClose={onClose} title="New Multi-Step Task" onSubmit={() => { void submit() }} isSubmitting={saving} submitLabel="Create" width={560}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Task Name" required value={taskName} onChange={e => setTaskName(e.target.value)} />
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField size="small" label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Deadline" type="date" required value={taskDeadLine} onChange={e => setTaskDeadLine(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControl size="small" fullWidth>
          <InputLabel>Assignee</InputLabel>
          <Select label="Assignee" value={assignPerson} onChange={e => setAssignPerson(e.target.value)}>
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Sub-tasks</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setSubTasks(s => [...s, { title: "", taskDeadLine: "", assignPerson: "" }])}>
            Add step
          </Button>
        </Box>
        {subTasks.map((step, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap", p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <TextField size="small" label={`Step ${i + 1} title`} value={step.title} onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, title: e.target.value } : s))} sx={{ flex: 1, minWidth: 160 }} />
            <TextField size="small" label="Deadline" type="date" value={step.taskDeadLine} onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, taskDeadLine: e.target.value } : s))} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Assignee</InputLabel>
              <Select label="Assignee" value={step.assignPerson} onChange={e => setSubTasks(arr => arr.map((s, j) => j === i ? { ...s, assignPerson: e.target.value } : s))}>
                {users.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" disabled={subTasks.length <= 1} onClick={() => setSubTasks(arr => arr.filter((_, j) => j !== i))} aria-label="Remove step">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </FormDrawer>
  )
}
