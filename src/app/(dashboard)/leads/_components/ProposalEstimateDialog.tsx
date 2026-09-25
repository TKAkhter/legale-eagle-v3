import { useEffect, useState } from "react"
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { leadsApi } from "@/api/leads"
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
  const [approvedBy, setApprovedBy] = useState("")
  const [reductionReason, setReductionReason] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQ = useQuery({
    queryKey: ["users", "min", "proposal"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  useEffect(() => {
    if (!open) return
    setError("")
    ;(async () => {
      try {
        const d = await leadsApi.getReductions(leadId)
        setProposedValue(String(d.proposedValue ?? ""))
        setApprovedValue(String(d.approvedValue ?? ""))
        setApprovedBy(String(d.approvedBy ?? ""))
        setReductionReason(String(d.reductionReason ?? ""))
      } catch {
        setProposedValue("")
        setApprovedValue("")
        setApprovedBy("")
        setReductionReason("")
      }
    })()
  }, [open, leadId])

  async function submit() {
    const proposed = parseFloat(proposedValue)
    if (!proposedValue || Number.isNaN(proposed) || proposed <= 0) {
      setError("Proposed value is required and must be greater than 0")
      return
    }
    const approved = approvedValue ? parseFloat(approvedValue) : null
    const needsReduction =
      (approved != null && !Number.isNaN(approved) && approved < proposed)
      || !!reductionReason.trim()
      || (!!approvedBy && approvedBy !== "none")
    if (needsReduction) {
      if (approved == null || Number.isNaN(approved)) {
        setError("Approved value is required when recording a reduction")
        return
      }
      if (!reductionReason.trim()) {
        setError("Reduction reason is required")
        return
      }
      if (!approvedBy || approvedBy === "none") {
        setError("Approved by is required")
        return
      }
    }
    setSaving(true)
    setError("")
    try {
      await leadsApi.saveReductions({
        leadId,
        proposedValue: proposed,
        approvedValue: approved,
        approvedBy: !approvedBy || approvedBy === "none" ? null : approvedBy,
        reductionReason: reductionReason.trim(),
      })
      onSuccess()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save proposal")
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]

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
        <TextField size="small" label="Proposed Value *" type="number" value={proposedValue} onChange={e => setProposedValue(e.target.value)} />
        <TextField size="small" label="Approved Value (LFA signed)" type="number" value={approvedValue} onChange={e => setApprovedValue(e.target.value)} />
        <TextField size="small" label="Reduction Reason" value={reductionReason} onChange={e => setReductionReason(e.target.value)} multiline minRows={2} />
        <FormControl size="small" fullWidth>
          <InputLabel>Approved By</InputLabel>
          <Select label="Approved By" value={approvedBy} onChange={e => setApprovedBy(e.target.value)}>
            <MenuItem value="none"><em>None</em></MenuItem>
            {users.map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {env.USE_STATIC_DATA && (
          <Alert severity="info">Static mode — values are not persisted to the server.</Alert>
        )}
      </Box>
    </FormDrawer>
  )
}
