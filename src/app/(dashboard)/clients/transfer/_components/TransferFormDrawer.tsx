import { useEffect, useMemo, useState } from "react"
import { Alert, Autocomplete, Box, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { miscModulesApi } from "@/api/miscModules"

interface ClientOption {
  id: string
  label: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function clientLabel(c: { companyName?: string; firstName?: string; lastName?: string; id: string }): string {
  return c.companyName
    || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    || c.id
}

export function TransferFormDrawer({ open, onClose, onSuccess }: Props) {
  const [from, setFrom] = useState<ClientOption | null>(null)
  const [to, setTo] = useState<ClientOption | null>(null)
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
          { id: "c3", companyName: "Desert Legal LLC" },
        ]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  const options = useMemo(
    () => ((clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string; lastName?: string }[])
      .map(c => ({ id: String(c.id), label: clientLabel(c) })),
    [clientsQuery.data],
  )

  useEffect(() => {
    if (!open) return
    setFrom(null)
    setTo(null)
    setReason("")
    setError("")
  }, [open])

  async function submit() {
    if (!from || !to) { setError("Select both clients"); return }
    if (from.id === to.id) { setError("From and To clients must differ"); return }
    if (!reason.trim()) { setError("Reason is required"); return }
    setSaving(true)
    setError("")
    try {
      await miscModulesApi.createTransfer({
        fromObject: from.id,
        toObject: to.id,
        transferReasons: reason.trim(),
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

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="New Client Transfer"
      subtitle="Move matters and related data from one client to another"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Initiate Transfer"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Autocomplete
          options={options}
          value={from}
          onChange={(_, v) => setFrom(v)}
          getOptionLabel={o => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          loading={clientsQuery.isFetching}
          renderInput={params => (
            <TextField {...params} size="small" label="From Client" required />
          )}
        />
        <Autocomplete
          options={options}
          value={to}
          onChange={(_, v) => setTo(v)}
          getOptionLabel={o => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          loading={clientsQuery.isFetching}
          renderInput={params => (
            <TextField {...params} size="small" label="To Client" required />
          )}
        />
        <TextField
          size="small"
          label="Reason"
          required
          multiline
          minRows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </Box>
    </FormDrawer>
  )
}
