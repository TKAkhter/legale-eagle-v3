import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField, FormControlLabel, Checkbox } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

export interface AssignedCreditCategory {
  creditCategoryId?: string
  creditActualLimit?: number
  creditCategoryName?: string
}

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  /** Prefill from currently assigned category when editing */
  initialCategory?: AssignedCreditCategory | null
  onSuccess: () => void
}

export function AssignCreditCategoryDrawer({ open, onClose, clientId, initialCategory, onSuccess }: Props) {
  const [categoryId, setCategoryId] = useState("")
  const [creditLimit, setCreditLimit] = useState("")
  const [allowOverLimit, setAllowOverLimit] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ["credit-categories"],
    enabled: open,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "cc1", name: "Standard", creditLimit: 50000, status: true },
          { id: "cc2", name: "VIP", creditLimit: 200000, status: true },
        ]
      }
      // Prefer masters list (OLD AssignCreditCategory); fall back to util list.
      try {
        const res = await axiosClient.get("/api/credit-categories/list")
        const list = res.data?.data ?? res.data ?? []
        if (Array.isArray(list) && list.length) {
          return list.filter((c: { status?: boolean }) => c.status !== false)
        }
      } catch { /* fall through */ }
      const res = await axiosClient.get("/api/util/list/credit-categories")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (!open) return
    setError("")
    if (initialCategory?.creditCategoryId) {
      setCategoryId(initialCategory.creditCategoryId)
      setCreditLimit(
        initialCategory.creditActualLimit != null ? String(initialCategory.creditActualLimit) : "",
      )
    } else {
      setCategoryId("")
      setCreditLimit("")
    }
    setAllowOverLimit(true)
  }, [open, initialCategory])

  useEffect(() => {
    if (!categoryId || !open) return
    if (initialCategory?.creditCategoryId && categoryId === initialCategory.creditCategoryId) return
    const selected = (categories as { id: string; creditLimit?: number }[]).find(c => c.id === categoryId)
    if (selected?.creditLimit != null) setCreditLimit(String(selected.creditLimit))
  }, [categoryId, categories, initialCategory, open])

  async function submit() {
    if (!categoryId) { setError("Select a credit category"); return }
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        // Old LMS: POST /client-credit-categories/add
        await axiosClient.post("/api/client-credit-categories/add", {
          clientId,
          creditCategoryId: categoryId,
          creditLimit: Number(creditLimit) || 0,
          allowOverLimit,
        })
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to assign category")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={initialCategory ? "Edit Credit Category" : "Assign Credit Category"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Assign"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Credit Category</InputLabel>
          <Select label="Credit Category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {(categories as { id: string; name?: string }[]).map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name || c.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Credit Limit"
          type="number"
          value={creditLimit}
          onChange={e => setCreditLimit(e.target.value)}
        />
        <FormControlLabel
          control={<Checkbox checked={allowOverLimit} onChange={e => setAllowOverLimit(e.target.checked)} />}
          label="Allow over limit"
        />
      </Box>
    </FormDrawer>
  )
}
