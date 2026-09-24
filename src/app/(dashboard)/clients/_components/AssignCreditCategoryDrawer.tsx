import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
}

export function AssignCreditCategoryDrawer({ open, onClose, clientId, onSuccess }: Props) {
  const [categoryId, setCategoryId] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ["credit-categories"],
    enabled: open,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "cc1", name: "Standard" }, { id: "cc2", name: "VIP" }]
      }
      const res = await axiosClient.get("/api/util/list/credit-categories")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (open) { setCategoryId(""); setError("") }
  }, [open])

  async function submit() {
    if (!categoryId) { setError("Select a credit category"); return }
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/client/assign/credit-category", null, {
          params: { clientId, creditCategoryId: categoryId },
        })
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign category")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Assign Credit Category" onSubmit={() => { void submit() }} isSubmitting={saving} submitLabel="Assign">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box>
        <FormControl size="small" fullWidth>
          <InputLabel>Credit Category</InputLabel>
          <Select label="Credit Category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {(categories as { id: string; name?: string }[]).map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name || c.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </FormDrawer>
  )
}
