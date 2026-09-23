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
                      color="secondary"
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
      <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Deadline Tasks</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}>
          <Tab label={`Today (${today.length})`} />
          <Tab label={`Tomorrow (${tomorrow.length})`} />
        </Tabs>
      </Box>
      {!list.length ? (
        <Box sx={{ p: 3 }}><Typography color="text.secondary">No tasks</Typography></Box>
      ) : (
        <List dense disablePadding>
          {list.slice(0, 12).map((row, i) => {
            const id = String(row.taskId ?? row.id ?? i)
            return (
              <ListItemButton key={id} component={RouterLink} to={`/tasks/${id}`} divider>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{String(row.taskName ?? row.title ?? "Task")}</Typography>}
                  secondary={String(row.matterTitle ?? row.clientName ?? "")}
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
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Hearings</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}>
          <Tab label={`Today (${today.length})`} />
          <Tab label={`Tomorrow (${tomorrow.length})`} />
        </Tabs>
      </Box>
      {!list.length ? (
        <Box sx={{ p: 3 }}><Typography color="text.secondary">No hearings</Typography></Box>
      ) : (
        <List dense disablePadding>
          {list.slice(0, 15).map((row, i) => (
            <ListItemButton
              key={i}
              component={RouterLink}
              to={row.matterId ? `/matters/${String(row.matterId)}` : "/team/upcoming-hearings"}
              divider
            >
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{String(row.title ?? row.matterTitle ?? "Hearing")}</Typography>}
                secondary={[row.hearingDate ?? row.date, row.location ?? row.courtLocation].filter(Boolean).map(String).join(" · ")}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  )
}
