import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  shortMatterId?: string
  clientId?: string
  onSuccess: () => void
}

export function ShortMatterFormDrawer({ open, onClose, shortMatterId, clientId: fixedClientId, onSuccess }: Props) {
  const isEdit = !!shortMatterId
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState(fixedClientId ?? "")
  const [description, setDescription] = useState("")
  const [billingType, setBillingType] = useState("Hourly")

  const clientsQuery = useQuery({
    queryKey: ["clients", "mini", "short-matter"],
    enabled: open && !fixedClientId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "c1", companyName: "Al Rashid Holdings" }]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (!open) return
    setError("")
    setTitle("")
    setClientId(fixedClientId ?? "")
    setDescription("")
    setBillingType("Hourly")
    if (isEdit && shortMatterId && !env.USE_STATIC_DATA) {
      axiosClient.get("/api/matter/get/short/matter", { params: { id: shortMatterId } })
        .then(r => {
          const d = r.data?.data ?? r.data ?? {}
          setTitle(String(d.title ?? ""))
          setClientId(String(d.clientId ?? d.client?.id ?? fixedClientId ?? ""))
          setDescription(String(d.description ?? ""))
          setBillingType(String(d.billingType ?? "Hourly"))
        })
        .catch(() => {})
    }
  }, [open, shortMatterId, fixedClientId, isEdit])

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!clientId) { setError("Client is required"); return }
    setSaving(true)
    setError("")
    try {
      const payload = { title, clientId, description, billingType }
      if (!env.USE_STATIC_DATA) {
        if (isEdit) {
          await axiosClient.post("/api/matter/edit/short/matter", payload, { params: { id: shortMatterId } })
        } else {
          await axiosClient.post("/api/matter/short/matter", payload)
        }
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save short matter")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Short Matter" : "New Short Matter"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={isEdit ? "Update" : "Create"}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        {!fixedClientId && (
          <FormControl size="small" fullWidth>
            <InputLabel>Client</InputLabel>
            <Select label="Client" value={clientId} onChange={e => setClientId(e.target.value)}>
              {((clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string }[]).map(c => (
                <MenuItem key={c.id} value={c.id}>{c.companyName || c.firstName || c.id}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" fullWidth>
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            {["Hourly", "Fixed", "Session", "NoAgreement"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Description" multiline minRows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
