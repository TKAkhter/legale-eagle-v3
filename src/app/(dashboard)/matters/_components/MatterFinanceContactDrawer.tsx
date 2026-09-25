import { useEffect, useState } from "react"
import { Alert, Box, Checkbox, FormControlLabel, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { mattersApi } from "@/api/matters"

export interface MatterFinanceContactFormValues {
  id?: string
  name?: string
  email?: string
  contactNumber?: string
  primary?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  contact?: MatterFinanceContactFormValues | null
  onSuccess: (mode: "create" | "update") => void
}

export function MatterFinanceContactDrawer({ open, onClose, matterId, contact, onSuccess }: Props) {
  const isEdit = !!contact?.id
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [primary, setPrimary] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? "")
      setEmail(contact?.email ?? "")
      setContactNumber(contact?.contactNumber ?? "")
      setPrimary(Boolean(contact?.primary))
      setError("")
    }
  }, [open, contact])

  async function submit() {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        primary,
      }
      if (isEdit && contact?.id) {
        await mattersApi.updateFinanceContact({ ...payload, id: contact.id })
        onSuccess("update")
      } else {
        await mattersApi.createFinanceContact(matterId, payload)
        onSuccess("create")
      }
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as Error)?.message
        ?? "Failed to save contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Finance Contact" : "Add Finance Contact"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Save"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Name" required value={name} onChange={e => setName(e.target.value)} />
        <TextField size="small" label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <TextField size="small" label="Contact Number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
        <FormControlLabel
          control={<Checkbox checked={primary} onChange={e => setPrimary(e.target.checked)} />}
          label="Primary contact"
        />
      </Box>
    </FormDrawer>
  )
}
