import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { leadsApi } from "@/api/leads"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  currentAttorneyId?: string
  onSuccess: () => void
}

export function AssignAttorneyDrawer({ open, onClose, leadId, currentAttorneyId, onSuccess }: Props) {
  const [lawyerId, setLawyerId] = useState(currentAttorneyId ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setLawyerId(currentAttorneyId ?? "")
      setError("")
    }
  }, [open, currentAttorneyId])

  async function submit() {
    if (!lawyerId) {
      setError("Select an attorney")
      return
    }
    setSaving(true)
    setError("")
    try {
      await leadsApi.assignAttorney(leadId, lawyerId)
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign attorney")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Assign Attorney"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Assign"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Attorney</InputLabel>
          <Select label="Attorney" value={lawyerId} onChange={e => setLawyerId(e.target.value)}>
            {(users as { id: string; firstName?: string; lastName?: string; name?: string }[]).map(u => (
              <MenuItem key={u.id} value={u.id}>
                {u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </FormDrawer>
  )
}
