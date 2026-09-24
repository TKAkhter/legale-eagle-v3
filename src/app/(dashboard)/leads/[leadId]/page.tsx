import { useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import {
  Box, Typography, Paper, Chip, Button, Avatar, FormControl, InputLabel, MenuItem, Select, IconButton, Menu,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import EditIcon from "@mui/icons-material/Edit"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt"
import MoneyOffIcon from "@mui/icons-material/MoneyOff"
import RequestQuoteIcon from "@mui/icons-material/RequestQuote"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Tabs } from "@/components/ui/Tabs"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { DetailInfoRow } from "@/components/detail/DetailInfoRow"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { FollowupFormDrawer } from "../_components/FollowupFormDrawer"
import { LeadConvertDialog } from "../_components/LeadConvertDialog"
import { LeadFormDrawer } from "../_components/LeadFormDrawer"
import { AssignAttorneyDrawer } from "../_components/AssignAttorneyDrawer"
import { WriteOffDialog } from "../_components/WriteOffDialog"
import { ProposalEstimateDialog } from "../_components/ProposalEstimateDialog"
import { MeetingFormDrawer } from "../_components/MeetingFormDrawer"
import { fromNow, formatDate, formatDateTime } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import type { Lead } from "@/transformers/lead.transformer"
import type { GridParams } from "@/types/common.types"

function timelineStatus(item: Record<string, unknown>): string {
  return String(item.status ?? item.currentStatus ?? item.leadStatus ?? item.name ?? "")
}

function timelineDate(item: Record<string, unknown>): string {
  return String(item.changedAt ?? item.createdAt ?? item.updatedAt ?? item.date ?? "")
}

function timelineBy(item: Record<string, unknown>): string {
  const by = item.changedBy ?? item.createdBy ?? item.userName ?? item.addedByName
  if (!by) return ""
  if (typeof by === "string") return by
  const o = by as { firstName?: string; lastName?: string; name?: string }
  return o.name || `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
}

export default function LeadDetailPage() {
  const { leadId } = useParams()
  const location = useLocation()
  const fromMyLeads = location.pathname.startsWith("/my-leads") || new URLSearchParams(location.search).get("from") === "my-leads"
  const listPath = fromMyLeads ? "/my-leads" : "/leads"
  const listLabel = fromMyLeads ? "My Leads" : "Leads"
  const qc = useQueryClient()

  const [followupOpen, setFollowupOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [statusValue, setStatusValue] = useState("")
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  const { data: lead, isLoading, isError } = useQuery({
    queryKey: ["leads", "detail", leadId],
    queryFn: () => {
      logger.debug("LeadDetail", `id:${leadId}`)
      return leadsApi.getById(leadId!)
    },
    enabled: !!leadId,
  })

  const { data: followups = [] } = useQuery({
    queryKey: ["leads", "followups", leadId],
    queryFn: () => leadsApi.getFollowups(leadId!),
    enabled: !!leadId,
  })

  const { data: meetings = [] } = useQuery({
    queryKey: ["leads", "meetings", leadId],
    queryFn: () => leadsApi.getMeetings(leadId!),
    enabled: !!leadId,
  })

  const { data: conflicts = [] } = useQuery({
    queryKey: ["leads", "conflict", leadId],
    queryFn: () => leadsApi.getConflictChecks(leadId!),
    enabled: !!leadId,
  })

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["leads", "statuses"],
    queryFn: () => leadsApi.getLeadStatuses(),
  })

  const timelineQuery = useQuery({
    queryKey: ["leads", "status-timeline", leadId],
    queryFn: () => leadsApi.getStatusTimeline(leadId!),
    enabled: !!leadId,
  })

  const statusChoices = useMemo(() => {
    const opts = statusOptions.length ? statusOptions : ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
    return opts
  }, [statusOptions])

  if (isLoading) return <PageShell title="Lead"><DetailSkeleton /></PageShell>
  if (isError || !lead) {
    return (
      <PageShell title="Lead" breadcrumbs={[{ label: listLabel, path: listPath }, { label: "Not found" }]}>
        <Typography color="text.secondary">Lead not found.</Typography>
      </PageShell>
    )
  }

  const l = lead as Lead
  const name = l.name || "Lead"
  const writtenOff = ["WRITE_OFF", "Writeoff", "Write_Off"].includes(l.status)
  const converted = l.status === "CONVERTED" || l.status === "Converted"
  const timeline = ((timelineQuery.data ?? []) as Record<string, unknown>[])

  async function applyStatus() {
    if (!statusValue) return
    try {
      toast.success(await leadsApi.changeStatus(String(leadId), statusValue))
      setStatusValue("")
      qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
      qc.invalidateQueries({ queryKey: ["leads", "status-timeline", leadId] })
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Failed to update status")
    }
  }

  async function confirmReopen() {
    try {
      toast.success(await leadsApi.reopen(String(leadId)))
      qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
      qc.invalidateQueries({ queryKey: ["leads", "status-timeline", leadId] })
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Failed to reopen lead")
    }
  }

  return (
    <PageShell
      title={name}
      description={`Lead • ${l.practiceArea || "—"}`}
      breadcrumbs={[{ label: listLabel, path: listPath }, { label: name }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {!converted && !writtenOff && (
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
          )}
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFollowupOpen(true)}>Follow-up</Button>
          {!writtenOff && !converted && (
            <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={() => setConvertOpen(true)}>Convert</Button>
          )}
          {writtenOff && (
            <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setReopenOpen(true)}>Reopen</Button>
          )}
          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="More actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); setAssignOpen(true) }}>
              <PersonAddAltIcon fontSize="small" sx={{ mr: 1 }} /> Assign Attorney
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); setProposalOpen(true) }}>
              <RequestQuoteIcon fontSize="small" sx={{ mr: 1 }} /> Proposal / Estimate
            </MenuItem>
            {!fromMyLeads && !writtenOff && !converted && (
              <MenuItem onClick={() => { setMenuAnchor(null); setWriteOffOpen(true) }}>
                <MoneyOffIcon fontSize="small" sx={{ mr: 1 }} /> Write Off
              </MenuItem>
            )}
          </Menu>
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2, display: "flex", gap: 2.5, alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: "secondary.main", fontSize: 22, flexShrink: 0 }}>
          {(name[0] ?? "L").toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: "break-word" }}>{name}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
            <StatusBadge status={l.status} />
            {!!l.leadType && <Chip size="small" label={String(l.leadType)} variant="outlined" />}
            {!!l.practiceArea && <Chip size="small" label={l.practiceArea} variant="outlined" />}
            {!!l.conflictCheckStatus && <Chip size="small" label={`Conflict: ${l.conflictCheckStatus}`} variant="outlined" />}
            {!!l.department && <Chip size="small" label={l.department} variant="outlined" />}
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ width: { xs: "100%", sm: "auto" } }}>
          Created {formatDate(l.createdAt)}
        </Typography>
      </Paper>

      <Tabs tabs={[
        {
          label: "Home",
          content: (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Contact</Typography>
                  <DetailInfoRow label="Email" value={l.email || "—"} />
                  <DetailInfoRow label="Phone" value={l.phone || "—"} />
                  <DetailInfoRow label="Company" value={l.companyName || "—"} />
                  <DetailInfoRow label="Opposing Party" value={l.partyOpposing || "—"} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Assignment</Typography>
                  <DetailInfoRow label="Attorney" value={l.attorneyName || "—"} />
                  <DetailInfoRow label="Practice Area" value={l.practiceArea || "—"} />
                  <DetailInfoRow label="Lead Source" value={l.leadSource || "—"} />
                  <DetailInfoRow label="Department" value={l.department || "—"} />
                  <DetailInfoRow label="Created By" value={l.createdBy || "—"} />
                  <DetailInfoRow label="Last Status Update" value={l.lastStatusUpdatedDate ? formatDate(l.lastStatusUpdatedDate) : "—"} />
                </Paper>
              </Box>

              {(l.description || l.dispute) && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Notes / Dispute</Typography>
                  <Typography variant="body2" color="text.secondary">{l.description || l.dispute}</Typography>
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Update Status</Typography>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusValue} onChange={e => setStatusValue(e.target.value)}>
                      {statusChoices.map(status => (
                        <MenuItem key={status} value={status}>{status.replace(/_/g, " ")}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" size="small" disabled={!statusValue} onClick={applyStatus}>Apply</Button>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Status Timeline</Typography>
                {!timeline.length && (
                  <Typography variant="body2" color="text.secondary">No status history yet</Typography>
                )}
                {timeline.map((item, i) => (
                  <Box key={String(item.id ?? `${timelineDate(item)}-${i}`)} sx={{ display: "flex", gap: 1.5, mb: 1.25, alignItems: "center", flexWrap: "wrap" }}>
                    <StatusBadge status={timelineStatus(item)} />
                    <Typography variant="body2">{formatDate(timelineDate(item))}</Typography>
                    {!!timelineBy(item) && (
                      <Typography variant="caption" color="text.secondary">{timelineBy(item)}</Typography>
                    )}
                    {!!item.note && (
                      <Typography variant="caption" color="text.secondary">· {String(item.note)}</Typography>
                    )}
                  </Box>
                ))}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Recent Follow-ups</Typography>
                  <Button size="small" onClick={() => setFollowupOpen(true)}>Add</Button>
                </Box>
                {!followups.length && <Typography variant="body2" color="text.secondary">No follow-ups yet</Typography>}
                {(followups as Record<string, unknown>[]).slice(0, 5).map((f, i) => (
                  <Box key={String(f.id ?? i)} sx={{ mb: 1.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(f.followUpContent ?? f.content ?? "—")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fromNow(String(f.followUpTime ?? f.createdAt ?? ""))}
                      {f.createdBy ? ` · ${String(f.createdBy)}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Box>
          ),
        },
        {
          label: `Follow-ups (${followups.length})`,
          content: (
            <Box sx={{ pt: 1 }}>
              {!followups.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No follow-ups yet</Typography>
              )}
              {(followups as Record<string, unknown>[]).map((f, i) => (
                <Box key={String(f.id ?? i)} sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "secondary.main", mt: 0.5, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(f.followUpContent ?? f.content ?? "—")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fromNow(String(f.followUpTime ?? f.createdAt ?? ""))}
                      {f.createdBy ? ` · ${String(f.createdBy)}` : ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ),
        },
        {
          label: `Meetings (${(meetings as unknown[]).length})`,
          content: (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setMeetingOpen(true)}>
                  Schedule Meeting
                </Button>
              </Box>
              {!(meetings as unknown[]).length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No meetings yet</Typography>
              )}
              {(meetings as Record<string, unknown>[]).map((m, i) => (
                <Paper key={String(m.id ?? i)} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {String(m.title ?? m.meetingTitle ?? m.subject ?? "Meeting")}
                    </Typography>
                    <StatusBadge status={String(m.status ?? m.meetingStatus ?? "")} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatDateTime(String(m.meetingDate ?? m.date ?? m.startTime ?? ""))}
                    {m.location ? ` · ${String(m.location)}` : ""}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ),
        },
        {
          label: "Time Log Entries",
          content: (
            <DataGrid
              columns={[
                { field: "activity", header: "Activity", renderCell: (v, row) => String(v ?? (row as { activityName?: string }).activityName ?? "—") },
                {
                  field: "totalHours",
                  header: "Hours",
                  align: "right",
                  renderCell: (_v, row) => {
                    const r = row as Record<string, unknown>
                    if (r.totalHours != null) return Number(r.totalHours).toFixed(2)
                    const h = Number(r.hours ?? 0)
                    const m = Number(r.minutes ?? 0)
                    return h || m ? `${h}:${String(m).padStart(2, "0")}h` : "0"
                  },
                },
                { field: "billing", header: "Amount", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { amount?: number }).amount ?? 0)) },
                {
                  field: "entryDate",
                  header: "Date",
                  renderCell: (v, row) => {
                    const d = v ?? (row as Record<string, unknown>).createdAt
                    return d ? formatDate(String(d)) : "—"
                  },
                },
                { field: "userName", header: "User", renderCell: (v, row) => String(v ?? (row as { responsiblePersonName?: string }).responsiblePersonName ?? "—") },
              ]}
              queryKey={["leads", "timelogs", leadId]}
              queryFn={(p: GridParams) => leadsApi.getTimelogs(String(leadId), p)}
              zebraStriping
            />
          ),
        },
        {
          label: "Conflict Check",
          content: (
            <Box sx={{ pt: 1 }}>
              {!(conflicts as unknown[]).length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  No conflict matches found
                </Typography>
              )}
              {(conflicts as Record<string, unknown>[]).map((c, i) => (
                <Paper key={String(c.id ?? i)} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {String(c.partyName ?? c.name ?? c.matchedName ?? "Match")}
                    </Typography>
                    <StatusBadge status={String(c.status ?? c.risk ?? "")} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {String(c.matchType ?? c.type ?? "—")}
                    {c.details ? ` · ${String(c.details)}` : ""}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ),
        },
        {
          label: "Logs",
          content: (
            <DataGrid
              columns={[
                { field: "action", header: "Action", renderCell: (v, row) => String(v ?? (row as { logType?: string }).logType ?? "—") },
                { field: "details", header: "Details", renderCell: (v, row) => String(v ?? (row as { logDec?: string }).logDec ?? (row as { title?: string }).title ?? "—") },
                { field: "userName", header: "User", renderCell: (v, row) => String(v ?? (row as { createdBy?: string }).createdBy ?? "—") },
                { field: "createdAt", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["leads", "logs", leadId]}
              queryFn={(p: GridParams) => leadsApi.getActivityLogs(String(leadId), p)}
              zebraStriping
            />
          ),
        },
        {
          label: "Documents",
          content: <DocumentsTab relatedTo="LEAD" relatedToId={String(leadId)} />,
        },
      ]} />

      <FollowupFormDrawer
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setFollowupOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "followups", leadId] })
          toast.success("Follow-up added")
        }}
      />
      <LeadConvertDialog open={convertOpen} onClose={() => setConvertOpen(false)} leadId={leadId!} leadName={name} />
      <LeadFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        leadId={leadId}
        onSaved={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
          toast.success("Lead updated")
        }}
      />
      <AssignAttorneyDrawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        leadId={leadId!}
        currentAttorneyId={l.attorneyId}
        onSuccess={() => {
          setAssignOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
          toast.success("Attorney assigned")
        }}
      />
      <WriteOffDialog
        open={writeOffOpen}
        onClose={() => setWriteOffOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setWriteOffOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
          toast.success("Lead written off")
        }}
      />
      <ProposalEstimateDialog
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setProposalOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
          toast.success("Proposal saved")
        }}
      />
      <MeetingFormDrawer
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setMeetingOpen(false)
          qc.invalidateQueries({ queryKey: ["leads", "meetings", leadId] })
          toast.success("Meeting scheduled")
        }}
      />
      <ConfirmDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={confirmReopen}
        title="Reopen Lead"
        message="Are you sure you want to reopen this lead?"
        confirmLabel="Reopen"
      />
    </PageShell>
  )
}
