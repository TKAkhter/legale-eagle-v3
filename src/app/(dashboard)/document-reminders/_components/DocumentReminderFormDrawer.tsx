import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { miscModulesApi } from "@/api/miscModules"

interface Props {
  open: boolean
  onClose: () => void
  reminder?: Record<string, unknown> | null
  onSuccess: () => void
}

export function DocumentReminderFormDrawer({ open, onClose, reminder, onSuccess }: Props) {
  const isEdit = !!reminder?.id
  const [documentName, setDocumentName] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expDate, setExpDate] = useState("")
  const [reminderBefore, setReminderBefore] = useState("7")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    setDocumentName(String(reminder?.documentName ?? reminder?.name ?? ""))
    setIssueDate(String(reminder?.issueDate ?? "").slice(0, 10))
    setExpDate(String(reminder?.expDate ?? reminder?.reminderDate ?? "").slice(0, 10))
    setReminderBefore(String(reminder?.reminderBefore ?? "7"))
  }, [open, reminder])

  async function submit() {
    if (!documentName.trim()) { setError("Document name is required"); return }
    if (!issueDate || !expDate) { setError("Issue and expiry dates are required"); return }
    setSaving(true)
    setError("")
    try {
      await miscModulesApi.createDocumentReminder({
        ...(isEdit ? { id: reminder!.id } : {}),
        documentName,
        issueDate,
        expDate,
        reminderBefore: Number(reminderBefore) || 0,
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save reminder")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Document Reminder" : "New Document Reminder"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={isEdit ? "Update" : "Create"}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Document Name" required value={documentName} onChange={e => setDocumentName(e.target.value)} />
        <TextField size="small" label="Issue Date" type="date" required value={issueDate} onChange={e => setIssueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Expiry Date" type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Remind Before (days)" type="number" value={reminderBefore} onChange={e => setReminderBefore(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
