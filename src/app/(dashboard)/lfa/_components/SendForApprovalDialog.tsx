/**
 * Send LFA for internal approval — LMS SendForApproval (approvePerson).
 */
import { useEffect, useState } from "react"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { adminApi } from "@/api/admin"
import { lfaApi } from "@/api/lfa"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  lfaId: string
  onSent?: () => void
}

export function SendForApprovalDialog({ open, onClose, lfaId, onSent }: Props) {
  const [approver, setApprover] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQ = useQuery({
    queryKey: ["users", "min", "lfa-approve"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  useEffect(() => {
    if (!open) return
    setApprover("")
    setError("")
  }, [open, lfaId])

  async function submit() {
    if (!approver) { setError("Approver is required"); return }
    setSaving(true)
    setError("")
    try {
      toast.success(await lfaApi.sendForApproval(lfaId, approver))
      onSent?.()
      onClose()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to send for approval",
      )
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Send for Approval</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl size="small" fullWidth required>
          <InputLabel>Approver</InputLabel>
          <Select label="Approver" value={approver} onChange={e => setApprover(e.target.value)}>
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => { void submit() }}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  )
}
