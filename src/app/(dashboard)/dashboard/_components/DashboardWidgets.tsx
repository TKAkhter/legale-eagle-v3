import { useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Tab, Tabs, Typography, List, ListItemButton, ListItemText, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { CellEllipsis } from "@/components/data-grid/CellEllipsis"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

type FollowupRow = {
  leadId: string
  followUpId: string
  leadName: string
  topic: string
  dispute: string
}

function normalizeFollowups(data: unknown): FollowupRow[] {
  const list = Array.isArray(data) ? data : []
  return list.map((row, i) => {
    const r = row as Record<string, unknown>
    const lead = (r.leads ?? r.lead ?? r) as Record<string, unknown>
    const follow = (r.leadFollowUp ?? r.followUp ?? r) as Record<string, unknown>
    const firstName = String(lead.firstName ?? "")
    const lastName = String(lead.lastName ?? "")
    const company = String(lead.companyName ?? "")
    const leadName = [firstName, lastName].filter(Boolean).join(" ").trim()
      || company
      || String(r.leadName ?? "Lead")
    return {
      leadId: String(lead.id ?? lead.leadId ?? r.leadId ?? r.id ?? i),
      followUpId: String(follow.id ?? follow.followUpId ?? r.followUpId ?? ""),
      leadName,
      topic: String(follow.content ?? follow.followUpContent ?? r.topic ?? "—"),
      dispute: String(lead.natureOfDispute ?? lead.dispute ?? r.dispute ?? "—"),
    }
  }).filter(row => row.leadId)
}

export function LeadFollowupsWidget() {
  const qc = useQueryClient()
  const [confirmId, setConfirmId] = useState<string>()

  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard", "lead-followups"],
    queryFn: () => dashboardApi.leadFollowups(),
    staleTime: 60_000,
  })

  const completeMutation = useMutation({
    mutationFn: (followUpId: string) => dashboardApi.completeLeadFollowup(followUpId),
    onSuccess: (message) => {
      toast.success(message || "Follow-up marked completed")
      setConfirmId(undefined)
      qc.invalidateQueries({ queryKey: ["dashboard", "lead-followups"] })
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to complete follow-up")
    },
  })

  if (isLoading) return <PanelLoader label="Loading lead follow-ups…" />

  const rows = normalizeFollowups(data)
  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">All clear — no assigned lead follow-ups</Typography>
      </Paper>
    )
  }

  return (
    <>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Follow-up Status</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Lead Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Topic</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nature of Dispute</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.leadId}-${row.followUpId}`} hover>
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`/leads/${row.leadId}`}
                      variant="body2"
                      sx={{ fontWeight: 600, color: "secondary.main", textDecoration: "none" }}
                    >
                      <CellEllipsis title={row.leadName}>{row.leadName}</CellEllipsis>
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <CellEllipsis title={row.topic}>{row.topic}</CellEllipsis>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <CellEllipsis title={row.dispute}>{row.dispute}</CellEllipsis>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      disabled={!row.followUpId || completeMutation.isPending}
                      onClick={() => setConfirmId(row.followUpId)}
                    >
                      Mark As Completed
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!confirmId} onClose={() => setConfirmId(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark follow-up completed?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will mark the assigned follow-up as completed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(undefined)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!confirmId || completeMutation.isPending}
            onClick={() => confirmId && completeMutation.mutate(confirmId)}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function TaskDeadlinesWidget() {
  const [tab, setTab] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "deadline-tasks"],
    queryFn: () => dashboardApi.deadlineTasks(),
    staleTime: 60_000,
  })

  if (isLoading) return <PanelLoader label="Loading deadline tasks…" />

  const today = (data?.today ?? []) as Record<string, unknown>[]
  const tomorrow = (data?.tomorrow ?? []) as Record<string, unknown>[]
  const list = tab === 0 ? today : tomorrow

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Deadline Tasks</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}>
          <Tab label={`Today (${today.length})`} />
          <Tab label={`Tomorrow (${tomorrow.length})`} />
        </Tabs>
      </Box>
      {!list.length ? (
        <Box sx={{ p: 3 }}><Typography color="text.secondary">No tasks</Typography></Box>
      ) : (
        <List dense disablePadding sx={{ maxHeight: 360, overflow: "auto" }}>
          {list.map((row, i) => {
            const id = String(row.taskId ?? row.id ?? i)
            const title = String(row.taskName ?? row.title ?? "Task")
            const deadline = row.taskDeadLine ?? row.deadline ?? row.dueDate
            const client = String(row.clientName ?? (row.client as { companyName?: string; firstName?: string })?.companyName
              ?? (row.client as { firstName?: string })?.firstName ?? "")
            const matter = String(row.matterTitle ?? (row.matter as { title?: string })?.title ?? "")
            const scope = String(row.scope ?? row.description ?? "")
            const secondary = [
              deadline ? `Deadline: ${formatDate(String(deadline))}` : "",
              client ? `Client: ${client}` : "",
              matter ? `Matter: ${matter}` : "",
              scope ? `Scope: ${scope}` : "",
            ].filter(Boolean).join(" · ")
            return (
              <ListItemButton key={id} component={RouterLink} to={`/tasks/${id}`} divider>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600 }}><CellEllipsis title={title}>{title}</CellEllipsis></Typography>}
                  secondary={<CellEllipsis title={secondary}>{secondary || "—"}</CellEllipsis>}
                />
              </ListItemButton>
            )
          })}
        </List>
      )}
    </Paper>
  )
}

export function HearingsWidget({
  series,
}: {
  series?: { today?: unknown[]; tomorrow?: unknown[] }
}) {
  const [tab, setTab] = useState(0)
  const today = (series?.today ?? []) as Record<string, unknown>[]
  const tomorrow = (series?.tomorrow ?? []) as Record<string, unknown>[]
  const list = tab === 0 ? today : tomorrow

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Upcoming Hearings</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}>
          <Tab label={`Today (${today.length})`} />
          <Tab label={`Tomorrow (${tomorrow.length})`} />
        </Tabs>
      </Box>
      {!list.length ? (
        <Box sx={{ p: 3 }}><Typography color="text.secondary">No hearings</Typography></Box>
      ) : (
        <List dense disablePadding sx={{ maxHeight: 420, overflow: "auto" }}>
          {list.map((row, i) => {
            const title = String(row.hearingTitle ?? row.title ?? row.matterTitle ?? "Hearing")
            const matter = String(row.matterTitle ?? (row.matter as { title?: string })?.title ?? "")
            const client = String(row.clientName ?? "")
            const note = String(row.note ?? row.summary ?? row.description ?? "")
            const next = row.nextHearingDate
            const chamber = [row.chamberNo, row.court, row.room, row.location ?? row.courtLocation].filter(Boolean).map(String).join(" · ")
            const when = [row.hearingDate ?? row.date, row.hearingTime ?? row.time].filter(Boolean).map(String).join(" ")
            const secondary = [
              when,
              matter && `Matter: ${matter}`,
              client && `Client: ${client}`,
              chamber,
              next && `Next: ${formatDate(String(next))}`,
              note,
            ].filter(Boolean).join(" · ")
            return (
              <ListItemButton
                key={i}
                component={RouterLink}
                to={row.matterId ? `/matters/${String(row.matterId)}` : "/team/upcoming-hearings"}
                divider
                alignItems="flex-start"
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: 1 }}>
                        <CellEllipsis title={title}>{title}</CellEllipsis>
                      </Typography>
                      {row.status != null && <Chip size="small" label={String(row.status)} variant="outlined" />}
                    </Box>
                  }
                  secondary={<CellEllipsis title={secondary}>{secondary || "—"}</CellEllipsis>}
                />
              </ListItemButton>
            )
          })}
        </List>
      )}
    </Paper>
  )
}

/** LMS ScheduleWidget — meetings today/tomorrow from `/meeting/get/shcedules`. */
export function MeetingsWidget() {
  const [tab, setTab] = useState(0)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "meeting-schedules"],
    queryFn: () => dashboardApi.meetingSchedules(),
    staleTime: 60_000,
  })

  if (isLoading) return <PanelLoader label="Loading meetings…" />

  const today = (data?.today ?? []) as Record<string, unknown>[]
  const tomorrow = (data?.tomorrow ?? []) as Record<string, unknown>[]
  const list = tab === 0 ? today : tomorrow
  const rangeLabel = tab === 0 ? "today" : "tomorrow"

  return (
    <>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mt: 2 }}>
        <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Meetings</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}>
            <Tab label={`Today (${today.length})`} />
            <Tab label={`Tomorrow (${tomorrow.length})`} />
          </Tabs>
        </Box>
        {!list.length ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">No meetings scheduled for {rangeLabel}.</Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 320, overflow: "auto" }}>
            {list.map((row, i) => {
              const title = String(row.title ?? row.meetingTitle ?? "Meeting")
              const time = [row.meetingStartTime, row.meetingEndTime].filter(Boolean).map(String).join(" – ")
              const withName = String(row.meetingWithName ?? row.withName ?? "")
              const secondary = [time, withName && `With: ${withName}`].filter(Boolean).join(" · ")
              return (
                <ListItemButton key={i} divider onClick={() => setDetail(row)}>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ fontWeight: 600 }}><CellEllipsis title={title}>{title}</CellEllipsis></Typography>}
                    secondary={<CellEllipsis title={secondary}>{secondary || "—"}</CellEllipsis>}
                  />
                </ListItemButton>
              )
            })}
          </List>
        )}
      </Paper>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{String(detail?.title ?? detail?.meetingTitle ?? "Meeting")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">
            <strong>Time:</strong>{" "}
            {[detail?.meetingStartTime, detail?.meetingEndTime].filter(Boolean).map(String).join(" – ") || "—"}
          </Typography>
          <Typography variant="body2">
            <strong>With:</strong> {String(detail?.meetingWithName ?? detail?.withName ?? "—")}
          </Typography>
          <Typography variant="body2">
            <strong>Added By:</strong> {String(detail?.addedByName ?? "—")}
          </Typography>
          <Typography variant="body2">
            <strong>Note:</strong> {String(detail?.note ?? "—")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

/** Compact WIP strip for Matters dashboard tab — uses reportsApi.wipSummary. */
export function WipSummaryWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "wip-summary"],
    queryFn: async () => {
      const { reportsApi } = await import("@/api/reports")
      return reportsApi.wipSummary()
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <PanelLoader label="Loading WIP summary…" />

  const summary = data as { totalWip?: number; totalHours?: number } | undefined
  const totalWip = Number(summary?.totalWip ?? 0)
  const totalHours = Number(summary?.totalHours ?? 0)

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mt: 0, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>WIP Summary</Typography>
          <Typography variant="body2" color="text.secondary">Unbilled billable work across fee earners</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total WIP</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
              {totalWip.toLocaleString(undefined, { style: "currency", currency: "AED", maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Hours</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{totalHours.toFixed(1)}</Typography>
          </Box>
          <Button component={RouterLink} to="/reports/wip" size="small" variant="outlined" sx={{ alignSelf: "center" }}>
            Open WIP Report
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
