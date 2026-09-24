import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { tasksApi } from "@/api/tasks"

interface Props {
  open: boolean
  onClose: () => void
  mainTaskId: string
  subTask?: Record<string, unknown> | null
  onSuccess: () => void
}

export function SubTaskFormDrawer({ open, onClose, mainTaskId, subTask, onSuccess }: Props) {
  const isEdit = !!subTask?.id
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [priority, setPriority] = useState("Normal")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    setTitle(String(subTask?.title ?? subTask?.taskName ?? ""))
    setDeadline(String(subTask?.taskDeadLine ?? "").slice(0, 10))
    setPriority(String(subTask?.priority ?? "Normal"))
    setDescription(String(subTask?.taskDescription ?? subTask?.note ?? ""))
  }, [open, subTask])

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return }
    setSaving(true)
    setError("")
    try {
      const payload = {
        title,
        taskName: title,
        taskDeadLine: deadline || undefined,
        priority,
        taskDescription: description,
        note: description,
      }
      if (isEdit && subTask?.id) {
        await tasksApi.update(String(subTask.id), payload)
      } else {
        await tasksApi.addSubtask(mainTaskId, payload)
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save sub-task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Sub-task" : "Add Sub-task"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={isEdit ? "Update" : "Add"}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField size="small" label="Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Priority" value={priority} onChange={e => setPriority(e.target.value)} />
        <TextField size="small" label="Description" multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
