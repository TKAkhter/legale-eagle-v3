/**
 * Lead status change — LMS UpdateStatus (comments + assign + department required).
 */
import { useEffect, useState } from "react"
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { adminApi } from "@/api/admin"
import { leadsApi } from "@/api/leads"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  statuses: string[]
  initialStatus?: string
  onSuccess?: () => void
}

export function LeadStatusDialog({ open, onClose, leadId, statuses, initialStatus = "", onSuccess }: Props) {
  const [status, setStatus] = useState("")
  const [stageComments, setStageComments] = useState("")
  const [assignTo, setAssignTo] = useState("")
  const [department, setDepartment] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQ = useQuery({
    queryKey: ["users", "min", "lead-status"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })
  const deptsQ = useQuery({
    queryKey: ["departments", "lead-status"],
    enabled: open,
    queryFn: () => adminApi.getDepartments(),
  })

  useEffect(() => {
    if (!open) return
    setStatus(initialStatus)
    setStageComments("")
    setAssignTo("")
    setDepartment("")
    setError("")
  }, [open, initialStatus])

  const users = (usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string; department?: { id?: string } }[]
  const departments = (deptsQ.data ?? []) as { id?: string; name?: string }[]

  async function submit() {
    if (!status) { setError("Status is required"); return }
    if (!stageComments.trim()) { setError("Comments are required"); return }
    if (!assignTo) { setError("Assign To is required"); return }
    if (!department) { setError("Department is required"); return }
    setSaving(true)
    setError("")
    try {
      toast.success(await leadsApi.changeStatus(leadId, status, {
        stageComments: stageComments.trim(),
        assignTo,
        department,
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to update status",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update Status</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth required>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            {statuses.map(s => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Assign To</InputLabel>
          <Select
            label="Assign To"
            value={assignTo}
            onChange={e => {
              const id = e.target.value
              setAssignTo(id)
              const u = users.find(x => String(x.id) === id)
              if (u?.department?.id) setDepartment(String(u.department.id))
            }}
          >
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Department</InputLabel>
          <Select label="Department" value={department} onChange={e => setDepartment(e.target.value)}>
            {departments.map(d => (
              <MenuItem key={String(d.id)} value={String(d.id)}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Comments *"
          multiline
          minRows={3}
          value={stageComments}
          onChange={e => setStageComments(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={() => { void submit() }}>
          {saving ? "Saving…" : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
