import { useMemo, useState } from "react"
import { Link as RouterLink, useLocation, useParams } from "react-router-dom"
import {
  Alert, Box, Typography, Paper, Chip, Button, Avatar, IconButton, Menu, MenuItem,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import EditIcon from "@mui/icons-material/Edit"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt"
import MoneyOffIcon from "@mui/icons-material/MoneyOff"
import RequestQuoteIcon from "@mui/icons-material/RequestQuote"
import GavelIcon from "@mui/icons-material/Gavel"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import LinkIcon from "@mui/icons-material/Link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
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
import { LeadStatusDialog } from "../_components/LeadStatusDialog"
import { MeetingFormDrawer } from "../_components/MeetingFormDrawer"
import { AttachTimelogEntriesDialog } from "../_components/AttachTimelogEntriesDialog"
import { LeadConflictTab } from "../_components/LeadConflictTab"
import { LeadStatusUploadDialog } from "../_components/LeadStatusUploadDialog"
import { LeadMeetingsTab } from "../_components/LeadMeetingsTab"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { fromNow, formatDate } from "@lib/utils/formatDate"
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
  const { t } = useTranslation()
  const { leadId } = useParams()
  const location = useLocation()
  const fromMyLeads = location.pathname.startsWith("/my-leads") || new URLSearchParams(location.search).get("from") === "my-leads"
  const listPath = fromMyLeads ? "/my-leads" : "/leads"
  const listLabel = fromMyLeads ? t("nav.myLeads") : t("nav.leads")
  const qc = useQueryClient()
  const leadLabel = t("pages.lead", "Lead")

  const [followupOpen, setFollowupOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusUploadOpen, setStatusUploadOpen] = useState(false)
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [attachTimelogOpen, setAttachTimelogOpen] = useState(false)
  const [attachActivityIds, setAttachActivityIds] = useState<string[]>([])
  const [timelogGridKey, setTimelogGridKey] = useState(0)
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

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["leads", "statuses"],
    queryFn: () => leadsApi.getLeadStatuses(),
  })

  const timelineQuery = useQuery({
    queryKey: ["leads", "status-timeline", leadId],
    queryFn: () => leadsApi.getStatusTimeline(leadId!),
    enabled: !!leadId,
  })

  const { data: reductions } = useQuery({
    queryKey: ["leads", "reductions", leadId],
    queryFn: () => leadsApi.getReductions(leadId!),
    enabled: !!leadId,
  })

  const { data: feeEarnerSummary } = useQuery({
    queryKey: ["leads", "fee-earner-summary", leadId],
    queryFn: () => leadsApi.getFeeEarnerSummary(leadId!),
    enabled: !!leadId,
  })

  const statusChoices = useMemo(() => {
    const opts = statusOptions.length ? statusOptions : ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
    return opts
  }, [statusOptions])

  if (isLoading) return <PageShell title={leadLabel}><DetailSkeleton /></PageShell>
  if (isError || !lead) {
    return (
      <PageShell title={leadLabel} breadcrumbs={[{ label: listLabel, path: listPath }, { label: "Not found" }]}>
        <Typography color="text.secondary">Lead not found.</Typography>
      </PageShell>
    )
  }

  const l = lead as Lead
  const name = l.name || leadLabel
  const writtenOff = l.writeOff || ["WRITE_OFF", "Writeoff", "Write_Off"].includes(l.status)
  const converted = l.converted || l.status === "CONVERTED" || l.status === "Converted"
  const conflictOk = String(l.conflictCheckStatus).replace(/\s+/g, "_") === "No_Conflict"
  const proposedValue = Number(reductions?.proposedValue ?? l.proposedValue ?? 0)
  const approvedValue = Number(reductions?.approvedValue ?? reductions?.lfaSignedValue ?? l.approvedValue ?? 0)
  const hasProposal = proposedValue > 0
  const timeline = ((timelineQuery.data ?? []) as Record<string, unknown>[])
  const convertLabel = l.repeated ? "Convert Lead" : "Close Lead"

  function tryConvert() {
    if (!conflictOk) {
      toast.error("Conflict check must be No Conflict before convert/close")
      return
    }
    if (!hasProposal) {
      toast.error("Proposal / estimate is required before convert/close")
      setProposalOpen(true)
      return
    }
    setConvertOpen(true)
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

  async function markNoConflict() {
    try {
      await leadsApi.completeConflict(String(leadId), "No_Conflict")
      toast.success("Conflict marked as No Conflict")
      qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
      qc.invalidateQueries({ queryKey: ["leads", "conflict", leadId] })
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Failed to complete conflict check")
    }
  }

  function invalidateLead() {
    qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
    qc.invalidateQueries({ queryKey: ["leads", "status-timeline", leadId] })
    qc.invalidateQueries({ queryKey: ["leads", "reductions", leadId] })
    qc.invalidateQueries({ queryKey: ["leads", "timelogs", leadId] })
    qc.invalidateQueries({ queryKey: ["leads", "fee-earner-summary", leadId] })
  }

  return (
    <PageShell
      title={name}
      description={`${leadLabel} • ${l.practiceArea || "—"}`}
      breadcrumbs={[{ label: listLabel, path: listPath }, { label: name }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {!converted && !writtenOff && (
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
          )}
          {!converted && !writtenOff && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFollowupOpen(true)}>Follow-up</Button>
          )}
          {!writtenOff && !converted && conflictOk && (
            <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={tryConvert}>
              {convertLabel}
            </Button>
          )}
          {writtenOff && (
            <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setReopenOpen(true)}>Reopen</Button>
          )}
          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="More actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {!converted && !writtenOff && (
              <MenuItem onClick={() => { setMenuAnchor(null); setAssignOpen(true) }}>
                <PersonAddAltIcon fontSize="small" sx={{ mr: 1 }} /> Assign Attorney
              </MenuItem>
            )}
            <MenuItem onClick={() => { setMenuAnchor(null); setProposalOpen(true) }}>
              <RequestQuoteIcon fontSize="small" sx={{ mr: 1 }} /> Proposal / Estimate
            </MenuItem>
            {!fromMyLeads && !writtenOff && !converted && (
              <MenuItem onClick={() => { setMenuAnchor(null); setWriteOffOpen(true) }}>
                <MoneyOffIcon fontSize="small" sx={{ mr: 1 }} /> Write Off
              </MenuItem>
            )}
            {!conflictOk && !converted && !writtenOff && (
              <MenuItem onClick={() => { setMenuAnchor(null); void markNoConflict() }}>
                <GavelIcon fontSize="small" sx={{ mr: 1 }} /> Mark No Conflict
              </MenuItem>
            )}
            <MenuItem component={RouterLink} to={`/conflict?leadId=${leadId}`} onClick={() => setMenuAnchor(null)}>
              <GavelIcon fontSize="small" sx={{ mr: 1 }} /> Check Conflict
            </MenuItem>
          </Menu>
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2, display: "flex", gap: 2.5, alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: writtenOff ? "error.main" : converted ? "success.main" : "warning.main",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {(name[0] ?? "L").toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: "break-word" }}>{name}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
            <StatusBadge status={l.status} />
            {!!l.leadType && <Chip size="small" label={String(l.leadType)} variant="outlined" />}
            {!!l.practiceArea && <Chip size="small" label={l.practiceArea} variant="outlined" />}
            {!!l.conflictCheckStatus && <Chip size="small" label={`Conflict: ${l.conflictCheckStatus}`} variant="outlined" color={conflictOk ? "success" : "default"} />}
            {!!l.department && <Chip size="small" label={l.department} variant="outlined" />}
            {l.repeated && <Chip size="small" label="Repeated" color="info" />}
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ width: { xs: "100%", sm: "auto" } }}>
          Created {formatDate(l.createdAt)}
        </Typography>
      </Paper>

      {!conflictOk && !converted && !writtenOff && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Conflict check must be No Conflict before updating status or converting/closing this lead.
        </Alert>
      )}

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
                  <DetailInfoRow label="Nationality" value={l.nationality || "—"} />
                  <DetailInfoRow label="External Lead ID" value={l.externalLeadId || "—"} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Assignment</Typography>
                  <DetailInfoRow label="Attorney" value={l.attorneyName || "—"} />
                  <DetailInfoRow label="Practice Area" value={l.practiceArea || "—"} />
                  <DetailInfoRow label="Lead Source" value={l.leadSource || "—"} />
                  <DetailInfoRow label="Department" value={l.department || "—"} />
                  <DetailInfoRow label="Procured By" value={l.procuredByName || "—"} />
                  <DetailInfoRow label="Group" value={l.groupName || "—"} />
                  <DetailInfoRow label="Created By" value={l.createdBy || "—"} />
                  <DetailInfoRow label="Last Status Update" value={l.lastStatusUpdatedDate ? formatDate(l.lastStatusUpdatedDate) : "—"} />
                </Paper>
              </Box>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Proposal / Estimate</Typography>
                  <Button size="small" onClick={() => setProposalOpen(true)}>Edit</Button>
                </Box>
                <DetailInfoRow label="Proposed Value" value={proposedValue ? formatCurrency(proposedValue) : "—"} />
                <DetailInfoRow label="LFA / Approved Value" value={approvedValue ? formatCurrency(approvedValue) : "—"} />
                {!hasProposal && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    A proposal is required before Close / Convert.
                  </Alert>
                )}
              </Paper>

              {(l.description || l.dispute) && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Nature of Dispute</Typography>
                  <Typography variant="body2" color="text.secondary">{l.description || l.dispute}</Typography>
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Status Timeline</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {!converted && !writtenOff && (
                      <Button size="small" variant="outlined" onClick={() => setStatusUploadOpen(true)}>
                        Upload Documents
                      </Button>
                    )}
                    {!converted && !writtenOff && (
                      <Button size="small" variant="contained" disabled={!conflictOk} onClick={() => setStatusOpen(true)}>
                        Update Status
                      </Button>
                    )}
                  </Box>
                </Box>
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
                    {!!(item.note ?? item.stageComments ?? item.comments) && (
                      <Typography variant="caption" color="text.secondary">
                        · {String(item.note ?? item.stageComments ?? item.comments)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Recent Follow-ups</Typography>
                  {!converted && !writtenOff && (
                    <Button size="small" onClick={() => setFollowupOpen(true)}>Add</Button>
                  )}
                </Box>
                {!followups.length && <Typography variant="body2" color="text.secondary">No follow-ups yet</Typography>}
                {(followups as Record<string, unknown>[]).slice(0, 5).map((f, i) => (
                  <Box key={String(f.id ?? i)} sx={{ mb: 1.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(f.followUpContent ?? f.content ?? "—")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fromNow(String(f.followUpTime ?? f.createdAt ?? ""))}
                      {f.createdBy ? ` · ${String(f.createdBy)}` : ""}
                      {f.completed != null ? ` · ${f.completed ? "Completed" : "Pending"}` : ""}
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
              {!converted && !writtenOff && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFollowupOpen(true)}>
                    Add Follow-up
                  </Button>
                </Box>
              )}
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
            <LeadMeetingsTab
              leadId={String(leadId)}
              meetings={meetings as Record<string, unknown>[]}
              converted={converted}
              writtenOff={writtenOff}
              onSchedule={() => setMeetingOpen(true)}
              onMeetingsChanged={() => {
                void qc.invalidateQueries({ queryKey: ["leads", "meetings", leadId] })
              }}
            />
          ),
        },
        {
          label: "Time Log Entries",
          content: (
            <Box>
              {!converted && !writtenOff && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="contained" startIcon={<AccessTimeIcon />} onClick={() => setLogTimeOpen(true)}>
                    Log Time
                  </Button>
                </Box>
              )}
              {converted && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Select time log entries, then use Attach Time Log Entries to link them to a matter.
                </Typography>
              )}
              {Array.isArray(feeEarnerSummary) && feeEarnerSummary.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Fee Earner Summary</Typography>
                  {(feeEarnerSummary as Record<string, unknown>[]).map((row, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 0.75 }}>
                      <Typography variant="body2" sx={{ minWidth: 140 }}>
                        {String(row.feeEarner ?? row.userName ?? row.name ?? "—")}
                      </Typography>
                      <Typography variant="body2">
                        Hours: <strong>{Number(row.hours ?? row.totalHours ?? 0).toFixed(2)}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Amount: <strong>{formatCurrency(Number(row.amount ?? row.billing ?? row.totalAmount ?? 0))}</strong>
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              )}
              <DataGrid
                key={timelogGridKey}
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
                hasRowSelection={converted}
                bulkActions={converted ? [{
                  label: "Attach Time Log Entries",
                  icon: <LinkIcon fontSize="small" />,
                  onClick: (selected) => {
                    const ids = selected
                      .map(r => String((r as Record<string, unknown>).activityId ?? (r as Record<string, unknown>).id ?? ""))
                      .filter(Boolean)
                    if (!ids.length) {
                      toast.error("Select at least one time log entry")
                      return
                    }
                    setAttachActivityIds(ids)
                    setAttachTimelogOpen(true)
                  },
                }] : undefined}
              />
            </Box>
          ),
        },
        {
          label: "Conflict Check",
          content: (
            <LeadConflictTab
              leadId={String(leadId)}
              canEdit={!converted && !writtenOff}
              conflictOk={conflictOk}
              onMarkNoConflict={!conflictOk && !converted && !writtenOff ? () => { void markNoConflict() } : undefined}
            />
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
      <LeadConvertDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        leadId={leadId!}
        leadName={name}
        repeated={!!l.repeated}
      />
      <LeadFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        leadId={leadId}
        onSaved={() => {
          setEditOpen(false)
          invalidateLead()
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
          invalidateLead()
          toast.success("Attorney assigned")
        }}
      />
      <WriteOffDialog
        open={writeOffOpen}
        onClose={() => setWriteOffOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setWriteOffOpen(false)
          invalidateLead()
          toast.success("Lead written off")
        }}
      />
      <ProposalEstimateDialog
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        leadId={leadId!}
        onSuccess={() => {
          setProposalOpen(false)
          invalidateLead()
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
      <LeadStatusDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        leadId={leadId!}
        statuses={statusChoices}
        initialStatus={l.status}
        onSuccess={invalidateLead}
      />
      <LeadStatusUploadDialog
        open={statusUploadOpen}
        onClose={() => setStatusUploadOpen(false)}
        leadId={leadId!}
        timeline={timeline}
        onSuccess={() => {
          invalidateLead()
          void qc.invalidateQueries({ queryKey: ["leads", "statuses"] })
        }}
      />
      <ActivityFormDrawer
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        prefillLeadId={leadId!}
        onSuccess={() => {
          setLogTimeOpen(false)
          invalidateLead()
          toast.success("Time entry logged")
        }}
      />
      <AttachTimelogEntriesDialog
        open={attachTimelogOpen}
        onClose={() => {
          setAttachTimelogOpen(false)
          setAttachActivityIds([])
        }}
        clientId={l.clientId}
        activityIds={attachActivityIds}
        onSuccess={() => {
          setAttachTimelogOpen(false)
          setAttachActivityIds([])
          setTimelogGridKey(k => k + 1)
          void qc.invalidateQueries({ queryKey: ["leads", "timelogs", leadId] })
          void qc.invalidateQueries({ queryKey: ["leads", "fee-earner-summary", leadId] })
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
