import { useEffect, useState } from "react"
import { Alert, Box, TextField } from "@mui/material"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  onSuccess: () => void
}

export function ProposalEstimateDialog({ open, onClose, leadId, onSuccess }: Props) {
  const [proposedValue, setProposedValue] = useState("")
  const [approvedValue, setApprovedValue] = useState("")
  const [lfaValue, setLfaValue] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    ;(async () => {
      try {
        if (env.USE_STATIC_DATA) {
          setProposedValue("25000")
          setApprovedValue("20000")
          setLfaValue("18000")
          return
        }
        const res = await axiosClient.get(`/api/leads/reductions/${leadId}`)
        const d = res.data?.data ?? res.data ?? {}
        setProposedValue(String(d.proposedValue ?? ""))
        setApprovedValue(String(d.approvedValue ?? ""))
        setLfaValue(String(d.lfaValue ?? ""))
        setNote(String(d.note ?? ""))
      } catch {
        setProposedValue("")
        setApprovedValue("")
        setLfaValue("")
        setNote("")
      }
    })()
  }, [open, leadId])

  async function submit() {
    setSaving(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/leads/reductions/save", {
          leadId,
          proposedValue: Number(proposedValue) || 0,
          approvedValue: Number(approvedValue) || 0,
          lfaValue: Number(lfaValue) || 0,
          note,
        })
      }
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save proposal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Proposal / Estimate"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Save"
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Proposed Value" type="number" value={proposedValue} onChange={e => setProposedValue(e.target.value)} />
        <TextField size="small" label="Approved Value" type="number" value={approvedValue} onChange={e => setApprovedValue(e.target.value)} />
        <TextField size="small" label="LFA Value" type="number" value={lfaValue} onChange={e => setLfaValue(e.target.value)} />
        <TextField size="small" label="Note" multiline minRows={2} value={note} onChange={e => setNote(e.target.value)} />
      </Box>
    </FormDrawer>
  )
}
