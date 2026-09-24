import { useEffect, useState } from "react"
import { Alert, Box, Checkbox, FormControlLabel, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { clientsApi } from "@/api/clients"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
}

export function FinanceContactDrawer({ open, onClose, clientId, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [primary, setPrimary] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setContactNumber("")
      setPrimary(false)
      setError("")
    }
  }, [open])

  async function submit() {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      await clientsApi.createFinanceContact(clientId, { name, email, contactNumber, primary })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Finance Contact"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Save"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Name" required value={name} onChange={e => setName(e.target.value)} />
        <TextField size="small" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <TextField size="small" label="Contact Number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
        <FormControlLabel
          control={<Checkbox checked={primary} onChange={e => setPrimary(e.target.checked)} />}
          label="Primary contact"
        />
      </Box>
    </FormDrawer>
  )
}
