/**
 * Dashboard — AdminTab parity with old LMS widgets under each tab.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Badge, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Paper,
  Tab, Tabs, Typography, Stack,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { dashboardApi } from "@/api/dashboard"
import { formatDate } from "@lib/utils/formatDate"
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
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard", "recent-activities"],
    queryFn: () => dashboardApi.recentActivities(),
    staleTime: 60_000,
  })
  if (isLoading) return <PanelLoader label="Loading recent activity…" />
  if (!data.length) return <Typography color="text.secondary">No recent activity</Typography>
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      {(data as Record<string, unknown>[]).slice(0, 25).map((item, i) => {
        const client = item.client as { firstName?: string; companyName?: string } | undefined
        const matter = item.matter as { title?: string } | undefined
        const label = matter?.title || client?.companyName || client?.firstName
          || String(item.activityName ?? item.description ?? "Activity")
        return (
          <Box key={i} sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {String(item.addedByName ?? item.userName ?? "")}
              {item.createdAt ? ` · ${formatDate(String(item.createdAt))}` : ""}
            </Typography>
          </Box>
        )
      })}
    </Paper>
  )
}

function FavouriteClientsPanel() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard", "fav-clients"],
    queryFn: () => dashboardApi.favouriteClients(),
    staleTime: 60_000,
  })
  if (isLoading) return <PanelLoader label="Loading favourite clients…" />
  if (!data.length) return <Typography color="text.secondary">No favourite clients yet</Typography>
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
      {(data as Record<string, unknown>[]).map((c) => {
        const id = String(c.clientId ?? c.id ?? "")
        const name = String(c.clientName ?? c.companyName ?? c.firstName ?? "Client")
        return (
          <Card key={id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardActionArea component={RouterLink} to={`/clients/${id}`}>
              <CardContent>
                <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
                {c.status != null && <Chip size="small" label={String(c.status)} sx={{ mt: 1 }} />}
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}
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
            <Box>
              <StatsGrid>
                <SummaryCard count={hearingSeries.data?.today?.length ?? 0} label="Today" to="/team/upcoming-hearings" />
                <SummaryCard count={hearingSeries.data?.tomorrow?.length ?? 0} label="Tomorrow" to="/team/upcoming-hearings" color="info.main" />
                <SummaryCard count={hearingBadge} label="Total" to="/team/hearing-calendar" />
              </StatsGrid>
              <HearingsWidget series={hearingSeries.data} />
            </Box>
          )}
          {active?.name === "Tasks" && <TasksPanel data={taskCount.data} />}
          {active?.name === "Recent Activities" && <RecentActivitiesPanel />}
          {active?.name === "Favourite Clients" && <FavouriteClientsPanel />}
          {active?.name === "Matter Roles" && <MatterRolesPanel onCount={setRoleCount} />}
          {active?.name === "Time Logs" && <TimeLogsWidget />}
        </>
      )}
    </PageShell>
  )
}
