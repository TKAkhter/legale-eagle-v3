import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { bankAccountsApi } from "@/api/bankAccounts"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
}

export function AllotBankAccountDrawer({ open, onClose, clientId, onSuccess }: Props) {
  const [bankId, setBankId] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ["bank-accounts", "allot"],
    queryFn: () => bankAccountsApi.getAll({ page: 0, pageSize: 100 }),
    enabled: open,
  })

  useEffect(() => {
    if (open) { setBankId(""); setError("") }
  }, [open])

  async function submit() {
    if (!bankId) { setError("Select a bank account"); return }
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/client/attach/bank", null, { params: { clientId, bankId } })
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to allot bank account")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Allot Bank Account" onSubmit={() => { void submit() }} isSubmitting={saving} submitLabel="Allot">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box>
        <FormControl size="small" fullWidth>
          <InputLabel>Bank Account</InputLabel>
          <Select label="Bank Account" value={bankId} onChange={e => setBankId(e.target.value)}>
            {(data?.content ?? []).map(b => (
              <MenuItem key={String(b.id)} value={String(b.id)}>
                {String(b.accountName ?? b.bankName ?? b.id)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </FormDrawer>
  )
}
