import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from "@mui/material"
import GroupIcon from "@mui/icons-material/Group"
import EditIcon from "@mui/icons-material/Edit"
import { useState } from "react"
import { mattersApi } from "@/api/matters"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailInfoRow } from "@/components/detail/DetailInfoRow"
import { SubMattersPanel } from "./SubMattersPanel"
import { MatterBillingWidgets } from "./MatterBillingWidgets"
import { MatterTeamDrawer } from "./MatterTeamDrawer"
import { MatterStatusUploadDialog } from "./MatterStatusUploadDialog"
import { toast } from "@/lib/toast"

function timelineStatusLabel(item: Record<string, unknown>): string {
  const nested = item.status
  if (nested && typeof nested === "object") {
    const o = nested as { statusName?: string; name?: string }
    return String(o.statusName ?? o.name ?? "")
  }
  return String(item.statusName ?? item.status ?? "")
}

function timelineDate(item: Record<string, unknown>): string {
  return String(item.changedAt ?? item.createdAt ?? item.date ?? item.updatedAt ?? "")
}

function timelineBy(item: Record<string, unknown>): string {
  const by = item.changedBy ?? item.createdBy ?? item.user
  if (by && typeof by === "object") {
    const o = by as { firstName?: string; lastName?: string; name?: string }
    if (o.name) return o.name
    return `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
  }
  return String(by ?? "")
}

function personName(value: unknown): string {
  const p = value as { firstName?: string; lastName?: string; name?: string } | null
  if (!p) return "—"
  if (p.name) return p.name
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—"
}

interface Props { matter: Record<string, unknown>; matterId: string; canEdit?: boolean }

export function MatterOverview({ matter, matterId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [teamOpen, setTeamOpen] = useState(false)
  const [estimateOpen, setEstimateOpen] = useState(false)
  const [estimateValue, setEstimateValue] = useState("")
  const [estimateError, setEstimateError] = useState("")
  const [savingEstimate, setSavingEstimate] = useState(false)
  const [capOpen, setCapOpen] = useState(false)
  const [capEnabled, setCapEnabled] = useState(false)
  const [capValue, setCapValue] = useState("")
  const [capType, setCapType] = useState("Flat")
  const [capError, setCapError] = useState("")
  const [savingCap, setSavingCap] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [checklistText, setChecklistText] = useState("")
  const [checklistError, setChecklistError] = useState("")
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [statusUploadOpen, setStatusUploadOpen] = useState(false)
  const checklistQuery = useQuery({
    queryKey: ["matters", "checklist", matterId],
    queryFn: () => mattersApi.getChecklist(matterId),
  })
  const teamQuery = useQuery({
    queryKey: ["matters", "team", matterId],
    queryFn: () => mattersApi.getTeam(matterId),
  })
  const timelineQuery = useQuery({
    queryKey: ["matters", "status-timeline", matterId],
    queryFn: () => mattersApi.getStatusTimeline(matterId),
  })
  const toggle = useMutation({
    mutationFn: (item: { id: string; checked: boolean; title?: string }) => mattersApi.updateChecklistItem(matterId, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", "checklist", matterId] }),
  })

  const client = (matter.client ?? matter.clientMini) as { companyName?: string; firstName?: string } | null
  const pa = (matter.practiceArea as { name?: string } | string | null)
  const department = (matter.department as { name?: string } | string | null)
  const lfaRaw = matter.lfa as Record<string, unknown> | null
  const lfaNo = String(lfaRaw?.lfaNo ?? lfaRaw?.agreementNo ?? matter.lfaNo ?? "—")
  const lfaType = String(lfaRaw?.lfaType ?? lfaRaw?.billingType ?? "—")
  const opposing = Array.isArray(matter.partyOpposing) ? matter.partyOpposing as Record<string, string>[] : []
  const reps = Array.isArray(matter.representatives) ? matter.representatives as Record<string, string>[] : []
  const checklistRaw = checklistQuery.data as unknown
  const checklist = (Array.isArray(checklistRaw)
    ? checklistRaw
    : Array.isArray((checklistRaw as { content?: unknown[] } | undefined)?.content)
      ? (checklistRaw as { content: unknown[] }).content
      : []).map((row, index) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? index),
      title: String(r.title ?? r.checkList ?? r.checklist ?? ""),
      checked: !!(r.checked ?? r.completed),
    }
  })
  const teamRaw = teamQuery.data as unknown
  const team = (Array.isArray(teamRaw)
    ? teamRaw
    : Array.isArray((teamRaw as { content?: unknown[] } | undefined)?.content)
      ? (teamRaw as { content: unknown[] }).content
      : Array.isArray((teamRaw as { team?: unknown[] } | undefined)?.team)
        ? (teamRaw as { team: unknown[] }).team
        : Array.isArray((teamRaw as { users?: unknown[] } | undefined)?.users)
          ? (teamRaw as { users: unknown[] }).users
          : []) as {
    id?: string
    userId?: string
    role?: string
    roleName?: string
    teamRoleDescription?: string
    primary?: boolean
    user?: { firstName?: string; lastName?: string }
    userName?: string
    firstName?: string
    lastName?: string
  }[]
  const timelineRaw = timelineQuery.data as unknown
  const statusTimeline = (Array.isArray(timelineRaw)
    ? timelineRaw
    : Array.isArray((timelineRaw as { content?: unknown[] } | undefined)?.content)
      ? (timelineRaw as { content: unknown[] }).content
      : []) as Record<string, unknown>[]

  const capEnabledCurrent = typeof matter.cap === "boolean"
    ? matter.cap
    : matter.capAmount != null && Number(matter.capAmount) > 0
  const capDisplay = matter.capAmount != null && matter.capAmount !== ""
    ? formatCurrency(Number(matter.capAmount))
    : (typeof matter.cap === "boolean" ? (matter.cap ? "Yes" : "No") : (matter.cap != null ? formatCurrency(Number(matter.cap)) : "—"))

  function openCapDialog() {
    setCapEnabled(!!capEnabledCurrent)
    setCapValue(matter.capAmount != null && Number(matter.capAmount) > 0 ? String(matter.capAmount) : "")
    setCapType(String(matter.capType ?? "Flat"))
    setCapError("")
    setCapOpen(true)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Matter Info</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1 }}>
          <DetailInfoRow label="Client" value={client?.companyName || client?.firstName || "—"} />
          <DetailInfoRow label="Title" value={String(matter.title ?? "—")} />
          <DetailInfoRow label="Location" value={String(matter.location ?? "—")} />
          <DetailInfoRow label="Status" value={<StatusBadge status={String(matter.status ?? "")} />} />
          <DetailInfoRow label="LFA No" value={lfaNo} />
          <DetailInfoRow label="LFA Type" value={lfaType} />
          <DetailInfoRow label="Department" value={typeof department === "string" ? department : department?.name ?? "—"} />
          <DetailInfoRow label="Practice Area" value={typeof pa === "string" ? pa : pa?.name ?? "—"} />
          <DetailInfoRow label="Open Date" value={formatDate(String(matter.openDate ?? ""))} />
          <DetailInfoRow label="Applicable Laws" value={String(matter.applicableLaws ?? matter.applicableLawName ?? matter.applicableLaw ?? "—")} />
          <DetailInfoRow label="Responsible Lawyer" value={personName(matter.responsibleAttorney)} />
          <DetailInfoRow label="Email Unique Id" value={String(matter.emailUniqueId ?? matter.emailUnique ?? "—")} />
          <DetailInfoRow label="Billing Type" value={String(matter.billingType ?? "—")} />
          <DetailInfoRow
            label="Estimate"
            value={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" component="span">
                  {matter.estimate != null ? formatCurrency(Number(matter.estimate)) : "—"}
                </Typography>
                {canEdit && (
                  <IconButton
                    size="small"
                    aria-label="Edit estimate"
                    onClick={() => {
                      setEstimateValue(matter.estimate != null ? String(matter.estimate) : "")
                      setEstimateError("")
                      setEstimateOpen(true)
                    }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                )}
              </Box>
            }
          />
          <DetailInfoRow
            label="Cap"
            value={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" component="span">{capDisplay}</Typography>
                {canEdit && (
                  <IconButton size="small" aria-label="Edit cap" onClick={openCapDialog}>
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                )}
              </Box>
            }
          />
          <DetailInfoRow label="Scope" value={String(matter.description ?? matter.matterSubject ?? "—")} />
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Opposing Parties</Typography>
          {!opposing.length && <Typography variant="body2" color="text.secondary">None</Typography>}
          {opposing.map((party, index) => (
            <Box key={`${party.name}-${index}`} sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{party.name || party.firstName || "—"}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[party.type, party.relation, party.phone, party.email].filter(Boolean).join(" · ") || "—"}
              </Typography>
            </Box>
          ))}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Representatives</Typography>
          {!reps.length && <Typography variant="body2" color="text.secondary">None</Typography>}
          {reps.map((rep, index) => (
            <Box key={`${rep.name}-${index}`} sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{rep.name}</Typography>
              <Typography variant="caption" color="text.secondary">{rep.role || "—"}</Typography>
            </Box>
          ))}
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Team</Typography>
          <Button size="small" startIcon={<GroupIcon />} onClick={() => setTeamOpen(true)}>
            Manage
          </Button>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {team.map((member, idx) => {
            const name = personName(member.user)
              || member.userName
              || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
              || "—"
            const role = member.role ?? member.roleName ?? member.teamRoleDescription ?? "Member"
            return (
              <Chip
                key={String(member.id ?? member.userId ?? idx)}
                label={`${name} · ${role}${member.primary ? " (Primary)" : ""}`}
                variant={member.primary ? "filled" : "outlined"}
                color={member.primary ? "primary" : "default"}
                size="small"
              />
            )
          })}
          {!team.length && <Typography variant="body2" color="text.secondary">No team assigned</Typography>}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Checklist</Typography>
          {canEdit && !String(matter.status ?? "").toUpperCase().includes("CLOSE") && (
            <Button size="small" onClick={() => { setChecklistText(""); setChecklistError(""); setChecklistOpen(true) }}>
              Add New
            </Button>
          )}
        </Box>
        {checklist.map(item => (
          <FormControlLabel
            key={item.id}
            control={
              <Checkbox
                checked={!!item.checked}
                onChange={e => toggle.mutate({ id: item.id, checked: e.target.checked, title: item.title })}
              />
            }
            label={item.title}
          />
        ))}
        {!checklist.length && <Typography variant="body2" color="text.secondary">No checklist items</Typography>}
      </Paper>

      <SubMattersPanel
        matterId={matterId}
        clientId={String((matter.client as { id?: string } | null)?.id ?? (matter.clientMini as { id?: string } | null)?.id ?? "")}
        canEdit={canEdit}
        subMatters={Array.isArray(matter.subMatters) ? matter.subMatters as Record<string, unknown>[] : []}
      />

      <MatterBillingWidgets matterId={matterId} />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Status Timeline</Typography>
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setStatusUploadOpen(true)}
            >
              Upload Documents
            </Button>
          )}
        </Box>
        {statusTimeline.map((item, i) => (
          <Box
            key={String(item.id ?? `${timelineDate(item)}-${i}`)}
            sx={{ display: "flex", gap: 1.5, mb: 1.25, alignItems: "center", flexWrap: "wrap" }}
          >
            <StatusBadge status={timelineStatusLabel(item)} />
            <Typography variant="body2">{formatDate(timelineDate(item))}</Typography>
            {!!timelineBy(item) && (
              <Typography variant="caption" color="text.secondary">{timelineBy(item)}</Typography>
            )}
            {!!(item.note ?? item.stageComments ?? item.comments) && (
              <Typography variant="caption" color="text.secondary">
                · {String(item.note ?? item.stageComments ?? item.comments)}
              </Typography>
            )}
          </Box>
        ))}
        {!statusTimeline.length && <Typography variant="body2" color="text.secondary">No status history</Typography>}
      </Paper>

      <MatterStatusUploadDialog
        open={statusUploadOpen}
        onClose={() => setStatusUploadOpen(false)}
        matterId={matterId}
        timeline={statusTimeline}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["matters", "status-timeline", matterId] })
        }}
      />

      <MatterTeamDrawer
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        matterId={matterId}
        matterTitle={String(matter.title ?? "")}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["matters", "team", matterId] })}
      />

      <Dialog open={estimateOpen} onClose={() => setEstimateOpen(false)} maxWidth="xs" fullWidth>
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
          <Button onClick={() => setEstimateOpen(false)} disabled={savingEstimate}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingEstimate}
            onClick={async () => {
              const value = parseFloat(estimateValue)
              if (Number.isNaN(value) || (value !== 0 && value < 500)) {
                setEstimateError("Estimate must be 0 or 500 and above.")
                return
              }
              setSavingEstimate(true)
              setEstimateError("")
              try {
                toast.success(await mattersApi.updateEstimate(matterId, value))
                setEstimateOpen(false)
                qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
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

      <Dialog open={capOpen} onClose={() => setCapOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Cap</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={capEnabled} onChange={e => setCapEnabled(e.target.checked)} />}
            label="Enable Cap"
          />
          <TextField
            label="Cap amount"
            type="number"
            fullWidth
            size="small"
            disabled={!capEnabled}
            value={capValue}
            onChange={e => setCapValue(e.target.value)}
            error={!!capError}
            helperText={capError || (capEnabled ? "Must be at least 500" : "Disabled cap sends amount 0")}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <FormControl fullWidth size="small" disabled={!capEnabled}>
            <InputLabel id="cap-type-label">Cap Type</InputLabel>
            <Select
              labelId="cap-type-label"
              label="Cap Type"
              value={capType}
              onChange={e => setCapType(String(e.target.value))}
            >
              <MenuItem value="Flat">Flat</MenuItem>
              <MenuItem value="Monthly" disabled>Monthly</MenuItem>
              <MenuItem value="Yearly" disabled>Yearly</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCapOpen(false)} disabled={savingCap}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingCap}
            onClick={async () => {
              const amount = capEnabled ? parseFloat(capValue) : 0
              if (capEnabled && (Number.isNaN(amount) || amount < 500)) {
                setCapError("Cap must be 500 or more when enabled.")
                return
              }
              setSavingCap(true)
              setCapError("")
              try {
                toast.success(await mattersApi.updateCap(matterId, {
                  enabled: capEnabled,
                  amount,
                  type: capType,
                }))
                setCapOpen(false)
                qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
              } catch (e) {
                setCapError((e as Error)?.message ?? "Failed to update cap")
              } finally {
                setSavingCap(false)
              }
            }}
          >
            {savingCap ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={checklistOpen} onClose={() => !savingChecklist && setChecklistOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Checklist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Check List"
            fullWidth
            size="small"
            value={checklistText}
            onChange={e => setChecklistText(e.target.value)}
            error={!!checklistError}
            helperText={checklistError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChecklistOpen(false)} disabled={savingChecklist}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingChecklist || !checklistText.trim()}
            onClick={async () => {
              if (!checklistText.trim()) {
                setChecklistError("Enter checklist.")
                return
              }
              setSavingChecklist(true)
              setChecklistError("")
              try {
                toast.success(await mattersApi.addChecklist(matterId, checklistText.trim()))
                setChecklistOpen(false)
                setChecklistText("")
                void qc.invalidateQueries({ queryKey: ["matters", "checklist", matterId] })
              } catch (e) {
                setChecklistError(
                  (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
                  ?? (e as Error)?.message
                  ?? "Failed to add checklist",
                )
              } finally {
                setSavingChecklist(false)
              }
            }}
          >
            {savingChecklist ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
