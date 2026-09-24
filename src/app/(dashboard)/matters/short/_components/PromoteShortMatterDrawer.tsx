import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  shortMatter: Record<string, unknown> | null
  onSuccess: () => void
}

/** Promote short matter → long matter (LMS MoveShortMatter). */
export function PromoteShortMatterDrawer({ open, onClose, shortMatter, onSuccess }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [openDate, setOpenDate] = useState("")
  const [billingType, setBillingType] = useState("Hourly")
  const [attorneyId, setAttorneyId] = useState("")
  const [opposingFirstName, setOpposingFirstName] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQuery = useQuery({
    queryKey: ["users", "min", "promote-short"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  useEffect(() => {
    if (!open || !shortMatter) return
    setTitle(String(shortMatter.title ?? shortMatter.matterTitle ?? ""))
    setDescription(String(shortMatter.description ?? ""))
    setOpenDate(String(shortMatter.openDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10))
    setBillingType(String(shortMatter.billingType ?? "Hourly"))
    setAttorneyId(String((shortMatter.responsibleAttorney as { id?: string } | undefined)?.id ?? shortMatter.responsibleAttorneyId ?? ""))
    setOpposingFirstName("")
    setError("")
  }, [open, shortMatter])

  async function submit() {
    if (!shortMatter?.id) return
    if (!title.trim()) { setError("Title is required"); return }
    if (!description.trim()) { setError("Description is required"); return }
    if (!openDate) { setError("Open date is required"); return }
    if (!attorneyId) { setError("Responsible attorney is required"); return }
    if (!opposingFirstName.trim()) { setError("Opposing party first name is required"); return }
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.put(`/api/matter/update/v2/${String(shortMatter.id)}`, {
          ...shortMatter,
          title,
          description,
          openDate,
          billingType,
          responsibleAttorneyId: attorneyId,
          matterType: "Long_Matter",
          partyOpposing: [{ firstName: opposingFirstName }],
        })
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to promote short matter")
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQuery.data ?? []) as { id?: string; firstName?: string; lastName?: string; companyUserType?: string }[]

  return (
    <FormDrawer open={open} onClose={onClose} title="Promote to Long Matter" onSubmit={() => { void submit() }} isSubmitting={saving} submitLabel="Promote">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField size="small" label="Description" required multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} />
        <TextField size="small" label="Open Date" type="date" required value={openDate} onChange={e => setOpenDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControl size="small" fullWidth>
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            {["Hourly", "Fixed", "Session", "Contingent", "NonContingent"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Responsible Attorney</InputLabel>
          <Select label="Responsible Attorney" value={attorneyId} onChange={e => setAttorneyId(e.target.value)}>
            {users.filter(u => !u.companyUserType || u.companyUserType === "ATTORNEY").map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" label="Opposing Party First Name" required value={opposingFirstName} onChange={e => setOpposingFirstName(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
