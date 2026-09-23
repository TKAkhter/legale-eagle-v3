import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Checkbox, Chip, FormControlLabel, Paper, Typography } from "@mui/material"
import { mattersApi } from "@/api/matters"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { StatusBadge } from "@/components/ui/StatusBadge"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

function personName(value: unknown): string {
  const p = value as { firstName?: string; lastName?: string; name?: string } | null
  if (!p) return "—"
  if (p.name) return p.name
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—"
}

interface Props { matter: Record<string, unknown>; matterId: string }

export function MatterOverview({ matter, matterId }: Props) {
  const qc = useQueryClient()
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
        : []) as { id: string; role?: string; primary?: boolean; user?: { firstName?: string; lastName?: string } }[]
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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1 }}>
          <InfoRow label="Client" value={client?.companyName || client?.firstName || "—"} />
          <InfoRow label="Title" value={String(matter.title ?? "—")} />
          <InfoRow label="Location" value={String(matter.location ?? "—")} />
          <InfoRow label="Status" value={<StatusBadge status={String(matter.status ?? "")} />} />
          <InfoRow label="LFA No" value={lfaNo} />
          <InfoRow label="LFA Type" value={lfaType} />
          <InfoRow label="Department" value={typeof department === "string" ? department : department?.name ?? "—"} />
          <InfoRow label="Practice Area" value={typeof pa === "string" ? pa : pa?.name ?? "—"} />
          <InfoRow label="Open Date" value={formatDate(String(matter.openDate ?? ""))} />
          <InfoRow label="Applicable Laws" value={String(matter.applicableLaws ?? matter.applicableLawName ?? matter.applicableLaw ?? "—")} />
          <InfoRow label="Responsible Lawyer" value={personName(matter.responsibleAttorney)} />
          <InfoRow label="Email Unique Id" value={String(matter.emailUniqueId ?? matter.emailUnique ?? "—")} />
          <InfoRow label="Billing Type" value={String(matter.billingType ?? "—")} />
          <InfoRow label="Estimate" value={matter.estimate != null ? formatCurrency(Number(matter.estimate)) : "—"} />
          <InfoRow label="Cap" value={capDisplay} />
          <InfoRow label="Scope" value={String(matter.description ?? matter.matterSubject ?? "—")} />
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Team</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {team.map(member => (
            <Chip
              key={member.id}
              label={`${personName(member.user)} · ${member.role ?? "Member"}${member.primary ? " (Primary)" : ""}`}
              variant={member.primary ? "filled" : "outlined"}
              color={member.primary ? "primary" : "default"}
              size="small"
            />
          ))}
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
    </Box>
  )
}
