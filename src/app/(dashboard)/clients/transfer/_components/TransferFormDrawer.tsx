import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { miscModulesApi } from "@/api/miscModules"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TransferFormDrawer({ open, onClose, onSuccess }: Props) {
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const clientsQuery = useQuery({
    queryKey: ["clients", "mini", "transfer"],
    enabled: open,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "c1", companyName: "Al Rashid Holdings" },
          { id: "c2", companyName: "KM Group" },
        ]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (!open) return
    setFromId("")
    setToId("")
    setReason("")
    setError("")
  }, [open])

  async function submit() {
    if (!fromId || !toId) { setError("Select both clients"); return }
    if (fromId === toId) { setError("From and To clients must differ"); return }
    if (!reason.trim()) { setError("Reason is required"); return }
    setSaving(true)
    setError("")
    try {
      await miscModulesApi.createTransfer({
        fromObject: fromId,
        toObject: toId,
        transferReasons: reason,
        transferType: "ClientToClient",
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create transfer")
    } finally {
      setSaving(false)
    }
  }

  const clients = (clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string }[]

  return (
    <FormDrawer open={open} onClose={onClose} title="New Client Transfer" onSubmit={() => { void submit() }} isSubmitting={saving} submitLabel="Create Transfer">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>From Client</InputLabel>
          <Select label="From Client" value={fromId} onChange={e => setFromId(e.target.value)}>
            {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.companyName || c.firstName || c.id}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>To Client</InputLabel>
          <Select label="To Client" value={toId} onChange={e => setToId(e.target.value)}>
            {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.companyName || c.firstName || c.id}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Reason" required multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
