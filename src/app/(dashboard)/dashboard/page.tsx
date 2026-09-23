/**
 * Dashboard — AdminTab parity with old LMS widgets under each tab.
 */
import { useEffect, useMemo, useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import {
  Badge, Box, Chip, CircularProgress, IconButton, List, ListItemButton, ListItemText,
  Paper, Tab, Tabs, Typography,
} from "@mui/material"
import StarIcon from "@mui/icons-material/Star"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { dashboardApi } from "@/api/dashboard"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { CellEllipsis } from "@/components/data-grid/CellEllipsis"
import { SummaryCard, StatsGrid } from "./_components/SummaryCard"
import { MattersGraph } from "./_components/MattersGraph"
import {
  LeadFollowupsWidget, TaskDeadlinesWidget, HearingsWidget,
} from "./_components/DashboardWidgets"
import { TimeLogsWidget } from "./_components/TimeLogsWidget"
import { MatterRolesPanel } from "./_components/MatterRolesPanel"
import { PanelLoader } from "@/components/ui/PanelLoader"

interface TabDef { id: string; name: string; label: string }

const DEFAULT_TABS: TabDef[] = [
  { id: "lead", name: "Leads", label: "Leads" },
  { id: "matter", name: "Matters", label: "Matters" },
  { id: "hearing", name: "hearings", label: "Hearing" },
  { id: "tasks", name: "Tasks", label: "Tasks" },
  { id: "recentActivities", name: "Recent Activities", label: "Recent Activities" },
  { id: "clients", name: "Favourite Clients", label: "Favourite Clients" },
  { id: "matterRoles", name: "Matter Roles", label: "Matter Roles" },
  { id: "timeLogs", name: "Time Logs", label: "Time Logs" },
]

function LeadsPanel({ data }: { data?: { openCount?: number; convertedCount?: number; writeOffCount?: number } }) {
  const open = data?.openCount ?? 0
  const converted = data?.convertedCount ?? 0
  const writeOff = data?.writeOffCount ?? 0
  return (
    <Box>
      <StatsGrid>
        <SummaryCard count={open} label="Open" to="/leads?status=Open" color="success.main" />
        <SummaryCard count={converted} label="Converted" to="/leads?status=Converted" color="info.main" />
        <SummaryCard count={writeOff} label="Write Off" to="/leads?status=Writeoff" color="error.main" />
        <SummaryCard count={open + converted + writeOff} label="Total" to="/leads" />
      </StatsGrid>
      <LeadFollowupsWidget />
    </Box>
  )
}

function MattersPanel({ data }: { data?: { open?: number; close?: number; reOpen?: number } }) {
  const open = data?.open ?? 0
  const close = data?.close ?? 0
  const reOpen = data?.reOpen ?? 0
  return (
    <Box>
      <StatsGrid>
        <SummaryCard count={open} label="Open" to="/matters?status=OPEN" color="success.main" />
        <SummaryCard count={close} label="Closed" to="/matters?status=CLOSE" color="error.main" />
        <SummaryCard count={reOpen} label="Re-Open" to="/matters?status=RE_OPEN" color="info.main" />
        <SummaryCard count={open + close + reOpen} label="Total" to="/matters" />
      </StatsGrid>
      <MattersGraph />
    </Box>
  )
}

function TasksPanel({ data }: { data?: { dueTask?: number; upcomingTask?: number; resubmitTask?: number; totalApproval?: number } }) {
  return (
    <Box>
      <StatsGrid>
        <SummaryCard count={data?.dueTask} label="Due" to="/tasks?taskStatus=Pending" color="error.main" />
        <SummaryCard count={data?.resubmitTask} label="Re-submit" to="/tasks?taskStatus=Re_Submit" color="warning.main" />
        <SummaryCard count={data?.upcomingTask} label="Upcoming" to="/tasks?taskStatus=Waiting_For_Approval" color="info.main" />
        <SummaryCard count={data?.totalApproval} label="Approvals" to="/approvals/task" />
      </StatsGrid>
      <TaskDeadlinesWidget />
    </Box>
  )
}

function RecentActivitiesPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-activities"],
    queryFn: () => dashboardApi.recentActivities(),
    staleTime: 60_000,
  })
  if (isLoading) return <PanelLoader label="Loading recent activity…" />

  const clients = (data?.clientRecentActivity ?? []) as Record<string, unknown>[]
  const matters = (data?.matterRecentActivity ?? []) as Record<string, unknown>[]

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: 400, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Clients</Typography>
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {!clients.length ? (
            <Typography color="text.secondary">No recent client activity</Typography>
          ) : clients.map((item, i) => {
            const c = (item.client ?? item) as Record<string, unknown>
            const name = c.clientType === "COMPANY"
              ? String(c.companyName ?? "Client")
              : String(c.firstName ?? c.companyName ?? "Client")
            const emailArr = c.email as { emailId?: string }[] | undefined
            const email = Array.isArray(emailArr) ? emailArr[0]?.emailId : String(c.emailId ?? "")
            const id = String(c.clientId ?? c.id ?? i)
            return (
              <Box
                key={i}
                component={RouterLink}
                to={`/clients/${id}`}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, py: 1.25,
                  borderBottom: "1px solid", borderColor: "divider", textDecoration: "none", color: "inherit",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box sx={{
                  width: 36, height: 36, borderRadius: "50%", bgcolor: "primary.main", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0,
                }}>
                  {name.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}><CellEllipsis title={name}>{name}</CellEllipsis></Typography>
                  <Typography variant="caption" color="text.secondary"><CellEllipsis title={email}>{email || "—"}</CellEllipsis></Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, height: 400, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Matters</Typography>
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {!matters.length ? (
            <Typography color="text.secondary">No recent matter activity</Typography>
          ) : matters.map((item, i) => {
            const m = (item.matter ?? item) as Record<string, unknown>
            const mini = m.clientMini as { clientType?: string; firstName?: string; companyName?: string } | undefined
            const clientName = mini?.clientType === "PERSON" ? mini.firstName : (mini?.companyName ?? mini?.firstName ?? "")
            const title = `${String(m.title ?? "Matter")}${clientName ? ` (${clientName})` : ""}`
            const desc = String(m.description ?? "")
            const id = String(m.matterId ?? m.id ?? i)
            return (
              <Box
                key={i}
                component={RouterLink}
                to={`/matters/${id}`}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, py: 1.25,
                  borderBottom: "1px solid", borderColor: "divider", textDecoration: "none", color: "inherit",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box sx={{
                  width: 36, height: 36, borderRadius: "50%", bgcolor: "primary.main", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0,
                }}>
                  {String(m.title ?? "M").charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}><CellEllipsis title={title}>{title}</CellEllipsis></Typography>
                  <Typography variant="caption" color="text.secondary"><CellEllipsis title={desc}>{desc || "—"}</CellEllipsis></Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Paper>
    </Box>
  )
}

function FavouriteClientsPanel() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard", "fav-clients"],
    queryFn: () => dashboardApi.favouriteClients(),
    staleTime: 60_000,
  })

  const groupQuery = useQuery({
    queryKey: ["dashboard", "fav-group"],
    queryFn: () => dashboardApi.favClientGroupName(),
    staleTime: 5 * 60_000,
  })

  const clients = data as Record<string, unknown>[]

  // Auto-select first client like LMS FavouriteClientWidget
  useEffect(() => {
    if (!selectedId && clients.length) {
      const first = String(clients[0].clientId ?? clients[0].id ?? "")
      if (first) setSelectedId(first)
    }
  }, [clients, selectedId])

  const mattersQuery = useQuery({
    queryKey: ["dashboard", "fav-client-matters", selectedId],
    queryFn: () => dashboardApi.favClientMatters(selectedId!),
    enabled: !!selectedId,
  })

  if (isLoading) return <PanelLoader label="Loading favourite clients…" />
  if (!clients.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">No favourite clients yet. Star a client from the Clients list to see them here.</Typography>
      </Paper>
    )
  }

  async function unfav(clientId: string) {
    try {
      await dashboardApi.unfavouriteClient(clientId)
      toast.success("The client has been removed from your list of preferred clients.")
      if (selectedId === clientId) setSelectedId(null)
      qc.invalidateQueries({ queryKey: ["dashboard", "fav-clients"] })
      qc.invalidateQueries({ queryKey: ["clients", "favourites"] })
    } catch {
      toast.error("Failed to update favourite")
    }
  }

  const heading = groupQuery.data
    ? `Favourite Clients of group ${groupQuery.data}`
    : "Favourite Clients"

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", height: { md: 400 }, display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{heading}</Typography>
        </Box>
        <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
          {clients.map((c) => {
            const id = String(c.clientId ?? c.id ?? "")
            const isCompany = String(c.clientType ?? "") === "COMPANY" || Boolean(c.companyName)
            const name = isCompany
              ? String(c.companyName || c.clientName || "Client")
              : String([c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") || c.companyName || "Client")
            const open = c.openMatter ?? c.openMatters ?? c.openMatterCount
            const last = c.lastActivityDate ?? c.lastActivity
            const selected = selectedId === id
            return (
              <ListItemButton
                key={id}
                selected={selected}
                onClick={() => setSelectedId(id)}
                onDoubleClick={() => navigate(`/clients/${id}`)}
                divider
                sx={{ borderRadius: 1, mx: 0.5 }}
              >
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600 }}><CellEllipsis title={name}>{name}</CellEllipsis></Typography>}
                  secondary={
                    <Box component="span" sx={{ display: "block" }}>
                      {open != null && (
                        <Typography variant="caption" color="text.secondary" component="span" sx={{ display: "block" }}>
                          Open Matter: {String(open)}
                        </Typography>
                      )}
                      {last != null && String(last) !== "" && (
                        <Typography variant="caption" color="text.secondary" component="span" sx={{ display: "block" }}>
                          Last Activity Date: {formatDate(String(last))}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => { e.stopPropagation(); unfav(id) }}
                  aria-label="Unfavourite"
                >
                  <StarIcon fontSize="small" color="warning" />
                </IconButton>
              </ListItemButton>
            )
          })}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", height: { md: 400 }, display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Open Matters</Typography>
        </Box>
        {!selectedId ? (
          <Box sx={{ p: 3 }}><Typography color="text.secondary">Select a client to view open matters</Typography></Box>
        ) : mattersQuery.isLoading ? (
          <PanelLoader label="Loading matters…" />
        ) : !(mattersQuery.data as unknown[])?.length ? (
          <Box sx={{ p: 3 }}><Typography color="text.secondary">No open matters</Typography></Box>
        ) : (
          <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
            {(mattersQuery.data as Record<string, unknown>[]).map((m) => {
              const id = String(m.id ?? m.matterId ?? "")
              const title = String(m.title ?? "Matter")
              const billing = String(m.billingType ?? "")
              const status = String(m.status ?? "")
              const desc = String(m.description ?? m.matterSubject ?? "")
              const last = m.lastActivityDate
              return (
                <ListItemButton key={id} component={RouterLink} to={`/matters/${id}`} divider alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: 1 }}>
                          <CellEllipsis title={`${title}${billing ? ` · ${billing}` : ""}`}>{title}{billing ? ` · ${billing}` : ""}</CellEllipsis>
                        </Typography>
                        {status && <Chip size="small" label={status} variant="outlined" color={status === "OPEN" ? "success" : "default"} />}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: "block" }}>
                        {desc && <Typography variant="caption" color="text.secondary" component="span" sx={{ display: "block" }}><CellEllipsis title={desc}>{desc}</CellEllipsis></Typography>}
                        {last != null && String(last) !== "" && (
                          <Typography variant="caption" color="text.secondary" component="span">
                            Last Activity: {formatDate(String(last))}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              )
            })}
          </List>
        )}
      </Paper>
    </Box>
  )
}

export default function DashboardPage() {
  const [tab, setTab] = useState(0)
  const [roleCount, setRoleCount] = useState<number | null>(null)

  const setupQuery = useQuery({
    queryKey: ["dashboard", "setup"],
    queryFn: () => dashboardApi.getSetup(),
    staleTime: 5 * 60_000,
  })

  const leadCount = useQuery({ queryKey: ["dashboard", "lead-count"], queryFn: () => dashboardApi.leadCount() })
  const matterCount = useQuery({ queryKey: ["dashboard", "matter-count"], queryFn: () => dashboardApi.matterCount() })
  const taskCount = useQuery({ queryKey: ["dashboard", "task-count"], queryFn: () => dashboardApi.taskCount() })
  const hearingSeries = useQuery({ queryKey: ["dashboard", "hearing-recent"], queryFn: () => dashboardApi.hearingRecent() })

  const tabs = useMemo(() => {
    const seq = setupQuery.data?.sequenceList as { id: string; name: string; seq: number }[] | undefined
    let mapped: TabDef[]
    if (!Array.isArray(seq) || !seq.length) {
      mapped = [...DEFAULT_TABS]
    } else {
      mapped = [...seq]
        .sort((a, b) => a.seq - b.seq)
        .map(item => ({
          id: item.id,
          name: item.name,
          label: DEFAULT_TABS.find(t => t.name === item.name || t.id === item.id)?.label ?? item.name,
        }))
    }
    if (!mapped.some(t => t.name === "Matter Roles")) {
      const matterIdx = mapped.findIndex(t => t.name === "Matters")
      const roleTab = { id: "matterRoles", name: "Matter Roles", label: "Matter Roles" }
      if (matterIdx >= 0) mapped.splice(matterIdx + 1, 0, roleTab)
      else mapped.push(roleTab)
    }
    if (!mapped.some(t => t.name === "Time Logs")) {
      mapped.push({ id: "timeLogs", name: "Time Logs", label: "Time Logs" })
    }
    return mapped
  }, [setupQuery.data])

  const active = tabs[tab] ?? tabs[0]
  const hearingBadge = (hearingSeries.data?.today?.length ?? 0) + (hearingSeries.data?.tomorrow?.length ?? 0)

  function badgeFor(name: string): number | null {
    if (name === "Leads") return leadCount.data?.openCount ?? null
    if (name === "Matters") return matterCount.data?.open ?? null
    if (name === "hearings" || name === "Hearing") return hearingBadge
    if (name === "Tasks") return taskCount.data?.dueTask ?? null
    if (name === "Matter Roles") return roleCount
    return null
  }

  return (
    <PageShell title="Dashboard" description="Overview and key performance indicators">
      {setupQuery.isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Tabs
            value={Math.min(tab, tabs.length - 1)}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 } }}
          >
            {tabs.map((item) => {
              const badge = badgeFor(item.name)
              return (
                <Tab
                  key={item.id}
                  label={
                    badge != null ? (
                      <Badge badgeContent={badge} color="primary" max={999}>
                        <Box sx={{ pr: 1.5 }}>{item.label}</Box>
                      </Badge>
                    ) : item.label
                  }
                />
              )
            })}
          </Tabs>

          {active?.name === "Leads" && <LeadsPanel data={leadCount.data} />}
          {active?.name === "Matters" && <MattersPanel data={matterCount.data} />}
          {(active?.name === "hearings" || active?.name === "Hearing") && (
            <HearingsWidget series={hearingSeries.data} />
          )}
          {active?.name === "Tasks" && <TasksPanel data={taskCount.data} />}
          {active?.name === "Recent Activities" && <RecentActivitiesPanel />}
          {active?.name === "Favourite Clients" || active?.id === "clients" || active?.label === "Favourite Clients" ? (
            <FavouriteClientsPanel />
          ) : null}
          {active?.name === "Matter Roles" && <MatterRolesPanel onCount={setRoleCount} />}
          {active?.name === "Time Logs" && <TimeLogsWidget />}
        </>
      )}
    </PageShell>
  )
}
