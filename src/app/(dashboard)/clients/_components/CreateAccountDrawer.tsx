import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { clientsApi } from "@/api/clients"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  defaultUsername?: string
  onSuccess: () => void
}

export function CreateAccountDrawer({ open, onClose, clientId, defaultUsername = "", onSuccess }: Props) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setUsername(defaultUsername)
      setPassword("")
      setError("")
    }
  }, [open, defaultUsername])

  async function submit() {
    if (!username.trim()) {
      setError("Username / email is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      await clientsApi.createAccount(clientId, username.trim(), password.trim() || undefined)
      onSuccess()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
          ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (e as { message?: string }).message
          ?? "Failed to create account",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Username"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Create"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          size="small"
          label="Username / Email"
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <TextField
          size="small"
          label="Password (optional)"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          helperText="Leave blank to let the server generate credentials"
        />
      </Box>
    </FormDrawer>
  )
}
