import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, Paper, Chip, Button, Avatar, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import EditIcon from "@mui/icons-material/Edit"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Tabs } from "@/components/ui/Tabs"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { FollowupFormDrawer } from "../_components/FollowupFormDrawer"
import { LeadConvertDialog } from "../_components/LeadConvertDialog"
import { LeadFormDrawer } from "../_components/LeadFormDrawer"
import { fromNow, formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import type { Lead } from "@/transformers/lead.transformer"
import type { GridParams } from "@/types/common.types"

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

export default function LeadDetailPage() {
  const { leadId } = useParams()
  const qc = useQueryClient()
  const [followupOpen, setFollowupOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [statusValue, setStatusValue] = useState("")

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

  const timelineQuery = useQuery({
    queryKey: ["leads", "status-timeline", leadId],
    queryFn: () => leadsApi.getStatusTimeline(leadId!),
    enabled: !!leadId,
  })

  if (isLoading) return <PageShell title="Lead"><DetailSkeleton /></PageShell>
  if (isError || !lead) {
    return (
      <PageShell title="Lead" breadcrumbs={[{ label: "Leads", path: "/leads" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Lead not found.</Typography>
      </PageShell>
    )
  }

  const l = lead as Lead
  const name = l.name || "Lead"
  const writtenOff = ["WRITE_OFF", "Writeoff"].includes(l.status)

  async function applyStatus() {
    if (!statusValue) return
    toast.success(await leadsApi.changeStatus(String(leadId), statusValue))
    setStatusValue("")
    qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
    qc.invalidateQueries({ queryKey: ["leads", "status-timeline", leadId] })
  }

  async function confirmReopen() {
    toast.success(await leadsApi.reopen(String(leadId)))
    qc.invalidateQueries({ queryKey: ["leads", "detail", leadId] })
  }

  return (
    <PageShell
      title={name}
      description={`Lead • ${l.practiceArea || "—"}`}
      breadcrumbs={[{ label: "Leads", path: "/leads" }, { label: name }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setFollowupOpen(true)}>Follow-up</Button>
          {!writtenOff && <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={() => setConvertOpen(true)}>Convert</Button>}
          {writtenOff && <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setReopenOpen(true)}>Reopen</Button>}
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, display: "flex", gap: 2.5, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: "secondary.main", fontSize: 22 }}>{name[0]?.toUpperCase() ?? "L"}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{name}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
            <StatusBadge status={l.status} />
            <Chip size="small" label={String(l.leadType ?? "")} variant="outlined" />
            {!!l.practiceArea && <Chip size="small" label={l.practiceArea} variant="outlined" />}
            {!!l.conflictCheckStatus && <Chip size="small" label={`Conflict: ${l.conflictCheckStatus}`} variant="outlined" />}
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled">Created {formatDate(l.createdAt)}</Typography>
      </Paper>

      <Tabs tabs={[
        {
          label: "Home",
          content: (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Contact</Typography>
                  <InfoRow label="Email" value={l.email || "—"} />
                  <InfoRow label="Phone" value={l.phone || "—"} />
                  <InfoRow label="Company" value={l.companyName || "—"} />
                  <InfoRow label="Opposing Party" value={l.partyOpposing || "—"} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Assignment</Typography>
                  <InfoRow label="Attorney" value={l.attorneyName || "—"} />
                  <InfoRow label="Practice Area" value={l.practiceArea || "—"} />
                  <InfoRow label="Lead Source" value={l.leadSource || "—"} />
                  <InfoRow label="Created By" value={l.createdBy || "—"} />
                  <InfoRow label="Last Status Update" value={l.lastStatusUpdatedDate ? formatDate(l.lastStatusUpdatedDate) : "—"} />
                </Paper>
              </Box>

              {!!l.description && (
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
                      {["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"].map(status => (
                        <MenuItem key={status} value={status}>{status.replace(/_/g, " ")}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" size="small" disabled={!statusValue} onClick={applyStatus}>Apply</Button>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Status Timeline</Typography>
                {((timelineQuery.data ?? []) as { id: string; status: string; changedAt: string; changedBy: string; note?: string }[]).map(item => (
                  <Box key={item.id} sx={{ display: "flex", gap: 1.5, mb: 1.25, alignItems: "center" }}>
                    <StatusBadge status={item.status} />
                    <Typography variant="body2">{formatDate(item.changedAt)}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.changedBy}</Typography>
                    {item.note && <Typography variant="caption" color="text.secondary">· {item.note}</Typography>}
                  </Box>
                ))}
              </Paper>
            </Box>
          ),
        },
        {
          label: `Follow-ups (${followups.length})`,
          content: (
            <Box sx={{ pl: 1, pt: 1 }}>
              {!followups.length && <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No follow-ups yet</Typography>}
              {(followups as Record<string, unknown>[]).map((f, i) => (
                <Box key={String(f.id ?? i)} sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "secondary.main", mt: 0.5, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, pb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(f.followUpContent ?? f.content ?? "—")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fromNow(String(f.createdAt ?? f.followUpTime ?? ""))}{f.createdBy ? ` · ${String(f.createdBy)}` : ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ),
        },
        {
          label: "Time Logs",
          content: (
            <DataGrid
              columns={[
                { field: "activity", header: "Activity" },
                { field: "totalHours", header: "Hours", align: "right" },
                { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                { field: "entryDate", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["leads", "timelogs", leadId]}
              queryFn={(p: GridParams) => leadsApi.getTimelogs(String(leadId), p)}
            />
          ),
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
