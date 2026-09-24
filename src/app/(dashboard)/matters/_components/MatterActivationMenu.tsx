/**
 * Matter LFA fee-type activations — enforcement / contingent / success rate.
 */
import { useMemo, useState } from "react"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Typography,
} from "@mui/material"
import BoltIcon from "@mui/icons-material/Bolt"
import { useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"

interface ActivationOption {
  key: string
  label: string
  run: () => Promise<string>
}

interface Props {
  matter: Record<string, unknown>
  matterId: string
}

export function MatterActivationMenu({ matter, matterId }: Props) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const lfa = (matter.lfa ?? {}) as Record<string, unknown>
  const lfaId = String(lfa.id ?? matter.lfaId ?? "")
  const enforcementActive = Boolean(matter.enforcementActive)
  const lfaEnforcement = Boolean(lfa.enforcement)
  const activeContingent = Boolean(lfa.activeContingent)
  const activeNonContingent = Boolean(lfa.activeNonContingent)
  const activeSuccessRate = Boolean(lfa.activeSuccessRate)
  const contingent = Number(lfa.contingent ?? 0)
  const nonContingent = Number(lfa.nonContingent ?? 0)
  const successRate = Number(lfa.successRate ?? 0)

  const options = useMemo(() => {
    const list: ActivationOption[] = []
    if (!enforcementActive && lfaEnforcement) {
      list.push({
        key: "enforcement",
        label: "Enable Enforcement",
        run: () => mattersApi.enableEnforcement(matterId),
      })
    }
    if (!activeNonContingent && nonContingent > 0 && lfaId) {
      list.push({
        key: "nonContingent",
        label: "Activate Non-Contingent",
        run: () => mattersApi.activateNonContingent(lfaId),
      })
    }
    if (!activeContingent && contingent > 0 && lfaId) {
      list.push({
        key: "contingent",
        label: "Activate Contingent",
        run: () => mattersApi.activateContingent(lfaId),
      })
    }
    if (!activeSuccessRate && successRate > 0 && lfaId) {
      list.push({
        key: "successRate",
        label: "Activate Success Rate",
        run: () => mattersApi.activateSuccessRate(lfaId, matterId),
      })
    }
    return list
  }, [
    enforcementActive, lfaEnforcement, activeNonContingent, nonContingent,
    activeContingent, contingent, activeSuccessRate, successRate, lfaId, matterId,
  ])

  if (options.length === 0) return null

  const current = options.find(o => o.key === selected)

  async function confirm() {
    if (!current) return
    setSaving(true)
    try {
      toast.success(await current.run())
      setConfirmOpen(false)
      setSelected("")
      qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? "Activation failed",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel>Activation</InputLabel>
        <Select
          label="Activation"
          value={selected}
          onChange={e => setSelected(String(e.target.value))}
        >
          {options.map(o => (
            <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        size="small"
        variant="contained"
        startIcon={<BoltIcon />}
        disabled={!selected}
        onClick={() => setConfirmOpen(true)}
      >
        Activate
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm activation</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {current
              ? `Activate “${current.label}” for this matter? This cannot be easily undone.`
              : "Select an activation option."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirm} disabled={saving || !current}>
            {saving ? "Activating…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
