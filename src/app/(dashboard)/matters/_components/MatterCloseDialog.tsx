import { useEffect, useMemo, useState } from "react"
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { adminApi } from "@/api/admin"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  matterTitle: string
  responsibleAttorneyId?: string
  onClosed?: () => void
}

/** LMS close-matter form parity — required attorneys/notes + optional file/trust fields. */
export function MatterCloseDialog({
  open, onClose, matterId, matterTitle, responsibleAttorneyId, onClosed,
}: Props) {
  const qc = useQueryClient()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [closeDate, setCloseDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState("")
  const [attorneyId, setAttorneyId] = useState(responsibleAttorneyId ?? "")
  const [finalAttorneyId, setFinalAttorneyId] = useState("")
  const [fileNo, setFileNo] = useState("")
  const [fileTitle, setFileTitle] = useState("")
  const [closingLetter, setClosingLetter] = useState("")
  const [closingLetterFrom, setClosingLetterFrom] = useState("")
  const [retainedMaterial, setRetainedMaterial] = useState("")
  const [materialReturnToClient, setMaterialReturnToClient] = useState("")
  const [materialReceivedDate, setMaterialReceivedDate] = useState("")
  const [destroyedMaterial, setDestroyedMaterial] = useState("")
  const [outstandingFees, setOutstandingFees] = useState("0")
  const [outstandingCosts, setOutstandingCosts] = useState("0")
  const [remainingFundInTrust, setRemainingFundInTrust] = useState("0")

  const usersQuery = useQuery({
    queryKey: ["users", "min", "close-matter"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  const attorneys = useMemo(() => {
    const list = (usersQuery.data ?? []) as { id?: string; firstName?: string; lastName?: string; companyUserType?: string; active?: boolean }[]
    return list.filter(u => u.active !== false && (u.companyUserType === "ATTORNEY" || !u.companyUserType))
  }, [usersQuery.data])

  useEffect(() => {
    if (!open) return
    setError("")
    setCloseDate(new Date().toISOString().slice(0, 10))
    setNote("")
    setAttorneyId(responsibleAttorneyId ?? "")
    setFinalAttorneyId("")
    setFileNo("")
    setFileTitle("")
    setClosingLetter("")
    setClosingLetterFrom("")
    setRetainedMaterial("")
    setMaterialReturnToClient("")
    setMaterialReceivedDate("")
    setDestroyedMaterial("")
    setOutstandingFees("0")
    setOutstandingCosts("0")
    setRemainingFundInTrust("0")
  }, [open, responsibleAttorneyId])

  async function submit() {
    if (!closeDate) { setError("Close date is required"); return }
    if (!note.trim()) { setError("Notes are required"); return }
    if (!attorneyId) { setError("Responsible attorney is required"); return }
    if (!finalAttorneyId) { setError("Final responsible attorney is required"); return }
    setSaving(true)
    setError("")
    try {
      await mattersApi.close(matterId, {
        closeDate,
        note,
        responsibleAttorneyId: attorneyId,
        finalResponsibleAttorneyId: finalAttorneyId,
        fileNo,
        fileTitle,
        closingLetter,
        closingLetterSentToClientFrom: closingLetterFrom,
        retainedMaterial,
        materialReturnToClient,
        materialReceivedDate: materialReceivedDate || undefined,
        destroyedMaterial,
        outstandingFees: Number(outstandingFees) || 0,
        outstandingCosts: Number(outstandingCosts) || 0,
        remainingFundInTrust: Number(remainingFundInTrust) || 0,
      })
      qc.invalidateQueries({ queryKey: ["matters"] })
      toast.success("Matter closed")
      onClosed?.()
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string }).message
        ?? "Failed to close matter")
    } finally {
      setSaving(false)
    }
  }

  function attorneyLabel(u: { firstName?: string; lastName?: string; id?: string }) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Close Matter</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Closing &quot;<strong>{matterTitle}</strong>&quot; will archive it and stop any running timers.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField size="small" label="Close Date" type="date" required value={closeDate} onChange={e => setCloseDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <FormControl size="small" fullWidth required>
            <InputLabel>Responsible Attorney</InputLabel>
            <Select label="Responsible Attorney" value={attorneyId} onChange={e => setAttorneyId(e.target.value)}>
              {attorneys.map(u => <MenuItem key={String(u.id)} value={String(u.id)}>{attorneyLabel(u)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth required>
            <InputLabel>Final Responsible Attorney</InputLabel>
            <Select label="Final Responsible Attorney" value={finalAttorneyId} onChange={e => setFinalAttorneyId(e.target.value)}>
              {attorneys.map(u => <MenuItem key={String(u.id)} value={String(u.id)}>{attorneyLabel(u)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="File No" value={fileNo} onChange={e => setFileNo(e.target.value)} />
          <TextField size="small" label="File Title" value={fileTitle} onChange={e => setFileTitle(e.target.value)} />
          <TextField size="small" label="Closing Letter" value={closingLetter} onChange={e => setClosingLetter(e.target.value)} />
          <TextField size="small" label="Closing Letter Sent From" value={closingLetterFrom} onChange={e => setClosingLetterFrom(e.target.value)} />
          <TextField size="small" label="Retained Material" value={retainedMaterial} onChange={e => setRetainedMaterial(e.target.value)} />
          <TextField size="small" label="Material Return to Client" value={materialReturnToClient} onChange={e => setMaterialReturnToClient(e.target.value)} />
          <TextField size="small" label="Material Received Date" type="date" value={materialReceivedDate} onChange={e => setMaterialReceivedDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Destroyed Material" value={destroyedMaterial} onChange={e => setDestroyedMaterial(e.target.value)} />
          <TextField size="small" label="Outstanding Fees" type="number" value={outstandingFees} onChange={e => setOutstandingFees(e.target.value)} />
          <TextField size="small" label="Outstanding Costs" type="number" value={outstandingCosts} onChange={e => setOutstandingCosts(e.target.value)} />
          <TextField size="small" label="Remaining Trust Funds" type="number" value={remainingFundInTrust} onChange={e => setRemainingFundInTrust(e.target.value)} />
          <TextField size="small" label="Notes" required multiline minRows={3} value={note} onChange={e => setNote(e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" color="error" onClick={() => void submit()} disabled={saving}>
          {saving ? <CircularProgress size={18} color="inherit" /> : "Close Matter"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
