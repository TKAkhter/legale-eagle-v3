import { useState } from "react"
import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  request: Record<string, unknown> | null
  onSuccess: () => void
}

export function ConvertRequestDrawer({ open, onClose, request, onSuccess }: Props) {
  const [billingType, setBillingType] = useState("Hourly")
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const id = String(request?.id ?? "")

  async function submit() {
    if (!id) return
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/matter/convert/request", {
          matterId: id,
          title: title || String(request?.title ?? ""),
          billingType,
        })
      }
      toast.success("Request converted to matter")
      onSuccess()
    } catch {
      toast.error("Conversion failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Convert Request Matter"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Convert"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          size="small"
          label="Matter Title"
          value={title || String(request?.title ?? "")}
          onChange={e => setTitle(e.target.value)}
        />
        <FormControl size="small">
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            {["Hourly", "Fixed", "Session", "Contingent", "NonContingent"].map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </FormDrawer>
  )
}
