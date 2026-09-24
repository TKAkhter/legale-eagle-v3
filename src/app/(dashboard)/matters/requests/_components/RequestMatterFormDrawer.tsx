import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { requestMattersApi } from "@/api/requestMatters"

interface Props {
  open: boolean
  onClose: () => void
  requestId?: string
  onSuccess: () => void
}

export function RequestMatterFormDrawer({ open, onClose, requestId, onSuccess }: Props) {
  const isEdit = !!requestId
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState("")
  const [attorneyId, setAttorneyId] = useState("")
  const [billingType, setBillingType] = useState("Hourly")
  const [openDate, setOpenDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [opposingFirstName, setOpposingFirstName] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const clientsQuery = useQuery({
    queryKey: ["clients", "mini", "request-matter"],
    enabled: open,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "c1", companyName: "Al Rashid Holdings" }]
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  const usersQuery = useQuery({
    queryKey: ["users", "min", "request-matter"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  useEffect(() => {
    if (!open) return
    setError("")
    setTitle("")
    setClientId("")
    setAttorneyId("")
    setBillingType("Hourly")
    setOpenDate(new Date().toISOString().slice(0, 10))
    setDescription("")
    setOpposingFirstName("")
    if (isEdit && requestId) {
      requestMattersApi.getById(requestId).then(m => {
        setTitle(String(m.title ?? ""))
        setClientId(String((m.client as { id?: string } | undefined)?.id ?? m.clientId ?? ""))
        setAttorneyId(String((m.responsibleAttorney as { id?: string } | undefined)?.id ?? m.responsibleAttorneyId ?? ""))
        setBillingType(String(m.billingType ?? "Hourly"))
        setOpenDate(String(m.openDate ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10))
        setDescription(String(m.description ?? m.matterSubject ?? ""))
        const opp = Array.isArray(m.partyOpposing) ? m.partyOpposing[0] as { firstName?: string } : null
        setOpposingFirstName(opp?.firstName ?? "")
      }).catch(() => {})
    }
  }, [open, requestId, isEdit])

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!clientId) { setError("Client is required"); return }
    if (!attorneyId) { setError("Attorney is required"); return }
    setSaving(true)
    setError("")
    try {
      const payload = {
        title,
        clientId,
        responsibleAttorneyId: attorneyId,
        billingType,
        openDate,
        description,
        matterSubject: description,
        matterType: "Request_Matter",
        status: "PENDING",
        partyOpposing: opposingFirstName.trim() ? [{ firstName: opposingFirstName }] : [],
      }
      if (isEdit && requestId) await requestMattersApi.update(requestId, payload)
      else await requestMattersApi.create(payload)
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save request matter")
    } finally {
      setSaving(false)
    }
  }

  const clients = (clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string }[]
  const users = (usersQuery.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Request Matter" : "New Request Matter"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={isEdit ? "Update" : "Create"}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <FormControl size="small" fullWidth>
          <InputLabel>Client</InputLabel>
          <Select label="Client" value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.companyName || c.firstName || c.id}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Attorney</InputLabel>
          <Select label="Attorney" value={attorneyId} onChange={e => setAttorneyId(e.target.value)}>
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            {["Hourly", "Fixed", "Session", "Contingent", "NonContingent"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Open Date" type="date" value={openDate} onChange={e => setOpenDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Opposing Party First Name" value={opposingFirstName} onChange={e => setOpposingFirstName(e.target.value)} />
        <TextField size="small" label="Description / Subject" multiline minRows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
