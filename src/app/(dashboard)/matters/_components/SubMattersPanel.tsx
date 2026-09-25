import { useEffect, useState } from "react"
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, IconButton, InputLabel, Menu, MenuItem, Paper, Select, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { adminApi } from "@/api/admin"
import { mattersApi } from "@/api/matters"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { MatterCloseDialog } from "./MatterCloseDialog"
import { MatterTeamDrawer } from "./MatterTeamDrawer"
import { StopWorkingDrawer } from "./StopWorkingDrawer"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"

interface Props {
  matterId: string
  subMatters?: Record<string, unknown>[]
  clientId?: string
  canEdit?: boolean
}

function subId(row: Record<string, unknown>): string {
  return String(row.id ?? row.matterId ?? "")
}

function isClosedStatus(status: unknown): boolean {
  return String(status ?? "").toUpperCase().includes("CLOSE")
}

function attorneyIdFromRow(row: Record<string, unknown>): string {
  const nested = row.responsibleAttorney as { id?: string } | null
  const lawyer = row.responsibleLawyerId as { id?: string } | string | null
  if (nested?.id) return nested.id
  if (lawyer && typeof lawyer === "object" && lawyer.id) return lawyer.id
  return String(row.responsibleAttorneyId ?? lawyer ?? "")
}

function lfaIdFromRow(row: Record<string, unknown>): string {
  const nested = row.lfa as { id?: string } | null
  return String(nested?.id ?? row.lfaId ?? "")
}

/** Sub-matters / SOW list with add + row actions (close/reopen, stop working, log time, estimate). */
export function SubMattersPanel({ matterId, subMatters = [], clientId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [estimate, setEstimate] = useState("")
  const [adding, setAdding] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuRow, setMenuRow] = useState<Record<string, unknown> | null>(null)

  const [closeRow, setCloseRow] = useState<Record<string, unknown> | null>(null)
  const [reopenRow, setReopenRow] = useState<Record<string, unknown> | null>(null)
  const [stopRow, setStopRow] = useState<Record<string, unknown> | null>(null)
  const [logTimeId, setLogTimeId] = useState<string | null>(null)
  const [estimateRow, setEstimateRow] = useState<Record<string, unknown> | null>(null)
  const [estimateValue, setEstimateValue] = useState("")
  const [estimateError, setEstimateError] = useState("")
  const [savingEstimate, setSavingEstimate] = useState(false)

  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editAttorney, setEditAttorney] = useState("")
  const [editLfa, setEditLfa] = useState("")
  const [editError, setEditError] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const [teamRow, setTeamRow] = useState<Record<string, unknown> | null>(null)

  const usersQ = useQuery({
    queryKey: ["users", "min", "sub-matter-edit"],
    enabled: !!editRow,
    queryFn: () => adminApi.getUsersMin(),
  })

  const lfasQ = useQuery({
    queryKey: ["lfa", "sub-matter-edit", clientId],
    enabled: !!editRow && !!clientId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "lfa1", agreementNo: "LFA-001", billingType: "Hourly", lfaStatus: "Approved", lfaType: "Default" },
        ]
      }
      const res = await axiosClient.get("/api/lfa/get/client", { params: { clientId } })
      const list = res.data?.data ?? res.data ?? []
      const arr = (Array.isArray(list) ? list : []) as Record<string, unknown>[]
      return arr.filter(lfa => {
        const status = String(lfa.lfaStatus ?? lfa.status ?? "")
        const type = String(lfa.lfaType ?? "")
        return status === "Approved" || type === "Default"
      })
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
  }

  const addMut = useMutation({
    mutationFn: async () => {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 250))
        return
      }
      await axiosClient.post("/api/matter/add-sub-matter", {
        matterId,
        title,
        estimate: Number(estimate) || 0,
      })
    },
    onSuccess: () => {
      setTitle("")
      setEstimate("")
      setAdding(false)
      invalidate()
      toast.success("Sub-matter added")
    },
    onError: () => toast.error("Failed to add sub-matter"),
  })

  const rows = subMatters.length
    ? subMatters
    : env.USE_STATIC_DATA
      ? [{ id: "sm1", title: "SOW1 — Pleadings", estimate: 10000, status: "OPEN" }]
      : []

  useEffect(() => {
    if (!editRow) return
    setEditDescription(String(editRow.description ?? editRow.title ?? ""))
    setEditAttorney(attorneyIdFromRow(editRow))
    setEditLfa(lfaIdFromRow(editRow))
    setEditError("")
  }, [editRow])

  function openMenu(e: React.MouseEvent<HTMLElement>, row: Record<string, unknown>) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuRow(row)
  }

  function closeMenu() {
    setMenuAnchor(null)
    setMenuRow(null)
  }

  async function confirmReopen() {
    const id = reopenRow ? subId(reopenRow) : ""
    if (!id) return
    try {
      toast.success(await mattersApi.reopen(id))
      setReopenRow(null)
      invalidate()
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "Failed to reopen sub-matter")
    }
  }

  async function submitEditDetails() {
    const id = editRow ? subId(editRow) : ""
    if (!id) return
    if (!editDescription.trim()) {
      setEditError("Description is required")
      return
    }
    if (!editAttorney) {
      setEditError("Responsible person is required")
      return
    }
    if (!editLfa) {
      setEditError("LFA is required")
      return
    }
    setSavingEdit(true)
    setEditError("")
    try {
      toast.success(await mattersApi.updateSubMatter(id, {
        description: editDescription.trim(),
        responsibleAttorney: editAttorney,
        lfa: editLfa,
        parentMatterId: matterId,
      }))
      setEditRow(null)
      invalidate()
    } catch (e) {
      setEditError(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as Error)?.message
        ?? "Failed to update sub-matter",
      )
    } finally {
      setSavingEdit(false)
    }
  }

  const users = (usersQ.data ?? []) as { id: string; firstName?: string; lastName?: string }[]
  const lfas = (lfasQ.data ?? []) as {
    id: string
    agreementNo?: string
    billingType?: string
  }[]

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sub-Matters / Scope</Typography>
        {canEdit && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(v => !v)}>
            {adding ? "Cancel" : "Add"}
          </Button>
        )}
      </Box>
      {adding && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <TextField size="small" label="Title" value={title} onChange={e => setTitle(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          <TextField size="small" label="Estimate" type="number" value={estimate} onChange={e => setEstimate(e.target.value)} sx={{ width: 120 }} />
          <Button size="small" variant="contained" disabled={!title.trim() || addMut.isPending} onClick={() => addMut.mutate()}>Save</Button>
        </Box>
      )}
      {!rows.length && <Typography variant="body2" color="text.secondary">No sub-matters</Typography>}
      {rows.map((row, i) => {
        const r = row as Record<string, unknown>
        const id = subId(r)
        return (
          <Box
            key={id || String(i)}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {String(r.title ?? r.sowNumber ?? `SOW ${i + 1}`)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.estimate != null ? formatCurrency(Number(r.estimate)) : "—"}
                {r.status ? ` · ${String(r.status)}` : ""}
              </Typography>
            </Box>
            {canEdit && id && (
              <IconButton size="small" aria-label="Sub-matter actions" onClick={e => openMenu(e, r)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )
      })}
      {addMut.isError && <Alert severity="error" sx={{ mt: 1 }}>Could not add sub-matter</Alert>}

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setEditRow(menuRow)
              closeMenu()
            }}
          >
            Edit Details
          </MenuItem>
        )}
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setTeamRow(menuRow)
              closeMenu()
            }}
          >
            Edit Team
          </MenuItem>
        )}
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setLogTimeId(subId(menuRow))
              closeMenu()
            }}
          >
            Log Time
          </MenuItem>
        )}
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setEstimateValue(menuRow.estimate != null ? String(menuRow.estimate) : "")
              setEstimateError("")
              setEstimateRow(menuRow)
              closeMenu()
            }}
          >
            Edit Estimate
          </MenuItem>
        )}
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setStopRow(menuRow)
              closeMenu()
            }}
          >
            Stop Working
          </MenuItem>
        )}
        {menuRow && !isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setCloseRow(menuRow)
              closeMenu()
            }}
          >
            Close
          </MenuItem>
        )}
        {menuRow && isClosedStatus(menuRow.status) && (
          <MenuItem
            onClick={() => {
              setReopenRow(menuRow)
              closeMenu()
            }}
          >
            Reopen
          </MenuItem>
        )}
      </Menu>

      <MatterCloseDialog
        open={!!closeRow}
        onClose={() => setCloseRow(null)}
        matterId={closeRow ? subId(closeRow) : ""}
        matterTitle={String(closeRow?.title ?? closeRow?.sowNumber ?? "Sub-matter")}
        responsibleAttorneyId={String(
          (closeRow?.responsibleAttorney as { id?: string } | null)?.id
          ?? closeRow?.responsibleAttorneyId
          ?? "",
        )}
        onClosed={invalidate}
      />

      <ConfirmDialog
        open={!!reopenRow}
        onClose={() => setReopenRow(null)}
        onConfirm={() => { void confirmReopen() }}
        title="Reopen Sub-Matter"
        message="Are you sure you want to reopen this sub-matter?"
        confirmLabel="Reopen"
      />

      <StopWorkingDrawer
        open={!!stopRow}
        onClose={() => setStopRow(null)}
        matterId={stopRow ? subId(stopRow) : ""}
        current={{
          enabled: !!(
            (stopRow?.matterStopWorking as { matterStopWorkingEnabled?: boolean } | undefined)?.matterStopWorkingEnabled
            ?? stopRow?.stopWorkingEnabled
          ),
          reasonId: String(
            (stopRow?.matterStopWorking as { matterStopWorkingReasonId?: string } | undefined)?.matterStopWorkingReasonId
            ?? stopRow?.stopWorkingReasonId
            ?? "",
          ),
        }}
        onSuccess={() => {
          setStopRow(null)
          invalidate()
          toast.success("Stop working updated")
        }}
      />

      <ActivityFormDrawer
        open={!!logTimeId}
        onClose={() => setLogTimeId(null)}
        prefillMatterId={logTimeId ?? undefined}
        prefillClientId={clientId || undefined}
        onSuccess={() => {
          setLogTimeId(null)
          invalidate()
          toast.success("Time entry saved")
        }}
      />

      <MatterTeamDrawer
        open={!!teamRow}
        onClose={() => setTeamRow(null)}
        matterId={teamRow ? subId(teamRow) : ""}
        matterTitle={String(teamRow?.title ?? teamRow?.sowNumber ?? "Sub-matter")}
        onSuccess={() => {
          setTeamRow(null)
          invalidate()
          toast.success("Team updated")
        }}
      />

      <Dialog open={!!editRow} onClose={() => !savingEdit && setEditRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Scope of Work</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editError && <Alert severity="error">{editError}</Alert>}
          <TextField
            label="Scope of Work"
            fullWidth
            size="small"
            multiline
            rows={4}
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            disabled={savingEdit}
          />
          <FormControl fullWidth size="small" disabled={savingEdit || usersQ.isLoading}>
            <InputLabel id="sub-matter-attorney">Responsible Person</InputLabel>
            <Select
              labelId="sub-matter-attorney"
              label="Responsible Person"
              value={editAttorney}
              onChange={e => setEditAttorney(String(e.target.value))}
              endAdornment={usersQ.isLoading ? <CircularProgress size={18} sx={{ mr: 3 }} /> : undefined}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" disabled>
            <InputLabel id="sub-matter-lfa">LFA</InputLabel>
            <Select
              labelId="sub-matter-lfa"
              label="LFA"
              value={editLfa}
              onChange={e => setEditLfa(String(e.target.value))}
            >
              {lfas.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.agreementNo ?? a.id}{a.billingType ? ` (${a.billingType})` : ""}
                </MenuItem>
              ))}
              {editLfa && !lfas.some(a => a.id === editLfa) && (
                <MenuItem value={editLfa}>{editLfa}</MenuItem>
              )}
            </Select>
            {lfasQ.isLoading && <FormHelperText>Loading LFAs…</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)} disabled={savingEdit}>Cancel</Button>
          <Button variant="contained" disabled={savingEdit} onClick={() => { void submitEditDetails() }}>
            {savingEdit ? "Submitting…" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!estimateRow} onClose={() => setEstimateRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Estimate</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Estimate amount"
            type="number"
            fullWidth
            size="small"
            value={estimateValue}
            onChange={e => setEstimateValue(e.target.value)}
            error={!!estimateError}
            helperText={estimateError || "Must be 0 (to clear) or at least 500"}
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEstimateRow(null)} disabled={savingEstimate}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingEstimate}
            onClick={async () => {
              const id = estimateRow ? subId(estimateRow) : ""
              if (!id) return
              const value = parseFloat(estimateValue)
              if (Number.isNaN(value) || (value !== 0 && value < 500)) {
                setEstimateError("Estimate must be 0 or 500 and above.")
                return
              }
              setSavingEstimate(true)
              setEstimateError("")
              try {
                toast.success(await mattersApi.updateEstimate(id, value))
                setEstimateRow(null)
                invalidate()
              } catch (e) {
                setEstimateError((e as Error)?.message ?? "Failed to update estimate")
              } finally {
                setSavingEstimate(false)
              }
            }}
          >
            {savingEstimate ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
