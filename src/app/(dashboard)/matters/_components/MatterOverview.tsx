import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Paper, TextField, Typography,
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
import { MatterTeamDrawer } from "./MatterTeamDrawer"
import { toast } from "@/lib/toast"

function personName(value: unknown): string {
  const p = value as { firstName?: string; lastName?: string; name?: string } | null
  if (!p) return "—"
  if (p.name) return p.name
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—"
}

interface Props { matter: Record<string, unknown>; matterId: string }

export function MatterOverview({ matter, matterId }: Props) {
  const qc = useQueryClient()
  const [teamOpen, setTeamOpen] = useState(false)
  const [estimateOpen, setEstimateOpen] = useState(false)
  const [estimateValue, setEstimateValue] = useState("")
  const [estimateError, setEstimateError] = useState("")
  const [savingEstimate, setSavingEstimate] = useState(false)
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
      : []) as { id: string; title: string; checked: boolean }[]
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
      : []) as { id: string; status: string; changedAt: string; changedBy: string; note?: string }[]

  const capDisplay = matter.capAmount != null && matter.capAmount !== ""
    ? formatCurrency(Number(matter.capAmount))
    : (typeof matter.cap === "boolean" ? (matter.cap ? "Yes" : "No") : (matter.cap != null ? formatCurrency(Number(matter.cap)) : "—"))

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
              </Box>
            }
          />
          <DetailInfoRow label="Cap" value={capDisplay} />
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Checklist</Typography>
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
        subMatters={Array.isArray(matter.subMatters) ? matter.subMatters as Record<string, unknown>[] : []}
      />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Status Timeline</Typography>
        {statusTimeline.map(item => (
          <Box key={item.id} sx={{ display: "flex", gap: 1.5, mb: 1.25, alignItems: "center" }}>
            <StatusBadge status={item.status} />
            <Typography variant="body2">{formatDate(item.changedAt)}</Typography>
            <Typography variant="caption" color="text.secondary">{item.changedBy}</Typography>
            {item.note && <Typography variant="caption" color="text.secondary">· {item.note}</Typography>}
          </Box>
        ))}
        {!statusTimeline.length && <Typography variant="body2" color="text.secondary">No status history</Typography>}
      </Paper>

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
    </Box>
  )
}
