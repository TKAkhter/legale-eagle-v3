/**
 * Dashboard page — customisable widget layout.
 *
 * Widget visibility and order is controlled by dashboardStore (localStorage).
 * The "Customise" button opens DashboardCustomiser drawer.
 *
 * Widgets available:
 *   kpi      — KPI cards (leads, matters, tasks)
 *   matters  — Matter activity area chart
 *   revenue  — Revenue breakdown bar chart
 *   activity — Recent firm-wide activity feed
 *   hearings — Upcoming hearings (coming soon)
 *   tasks    — My tasks widget (coming soon)
 *
 * Onboarding checklist shows until dismissed.
 */
import { useState } from "react"
import { Box, Typography, Paper, Skeleton, Chip, Button, IconButton, Tooltip } from "@mui/material"
import TuneIcon    from "@mui/icons-material/Tune"
import RefreshIcon from "@mui/icons-material/Refresh"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env }             from "@/config/env"
import { axiosClient as apiClient } from "@lib/api/axios"
import { useAuthStore }    from "@lib/store/authStore"
import { useDashboardStore } from "@lib/store/dashboardStore"
import { dashboard as staticDashboard } from "@/data/static"
import { ActivityFeed }    from "@/components/widgets/ActivityFeed"
import { DashboardCustomiser } from "@/components/widgets/DashboardCustomiser"
import { OnboardingChecklist } from "@/components/widgets/OnboardingChecklist"
import { ApexChart }       from "@components/charts/ApexChart"
import { logger }          from "@/lib/logger"

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, loading }: { title:string; value?:number; sub?:string; loading:boolean }) {
  return (
    <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb:0.5 }}>{title}</Typography>
      {loading
        ? <Skeleton width={80} height={40} />
        : <Box sx={{ display:"flex", alignItems:"baseline", gap:1 }}>
            <Typography variant="h4" sx={{ fontWeight:700 }}>{value ?? 0}</Typography>
            {sub && <Chip size="small" label={sub} variant="outlined" sx={{ fontSize:11 }} />}
          </Box>
      }
    </Paper>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

export default function DashboardPage() {
  const user    = useAuthStore(s => (s as {user?:{firstName?:string}}).user)
  const getVisible  = useDashboardStore(s => s.getVisible)
  const visibleWidgets = getVisible()
  const qc      = useQueryClient()
  const [custOpen, setCustOpen] = useState(false)

  // ── KPI data ────────────────────────────────────────────────────────────────
  const { data:counts, isLoading:l1 } = useQuery({
    queryKey: ["dashboard","counts"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return staticDashboard.counts
      logger.debug("DashboardPage", "Fetching KPI counts")
      const [a,b,c] = await Promise.allSettled([
        apiClient.get("/api/dashboard/lead/count"),
        apiClient.get("/api/dashboard/matter/count"),
        apiClient.get("/api/dashboard/task/count"),
      ])
      return {
        ...(a.status==="fulfilled" ? a.value.data?.data??{} : {}),
        ...(b.status==="fulfilled" ? b.value.data?.data??{} : {}),
        ...(c.status==="fulfilled" ? c.value.data?.data??{} : {}),
      }
    },
    staleTime: 5*60_000,
  })

  // ── Chart data ───────────────────────────────────────────────────────────────
  const { data:history, isLoading:l2 } = useQuery({
    queryKey: ["dashboard","history"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return staticDashboard.matterHistory
      const r = await apiClient.get("/api/analytics/graph/matters-history-monthly")
      return r.data?.data ?? []
    },
    staleTime: 10*60_000,
  })

  const { data:revenue, isLoading:l3 } = useQuery({
    queryKey: ["dashboard","revenue"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return staticDashboard.revenue
      const r = await apiClient.get("/api/analytics/graph/fixedfees-timelogs-revenue")
      return r.data?.data ?? []
    },
    staleTime: 10*60_000,
  })

  const months  = (history??[]).map((d:Record<string,unknown>) => String(d.month??""))
  const matData = (history??[]).map((d:Record<string,unknown>) => Number(d.count??0))
  const revMon  = (revenue??[]).map((d:Record<string,unknown>) => String(d.month??""))
  const fixed   = (revenue??[]).map((d:Record<string,unknown>) => Number(d.fixedFees??0))
  const tlogs   = (revenue??[]).map((d:Record<string,unknown>) => Number(d.timelogs??0))

  function isVisible(id: string) {
    return visibleWidgets.some(w => w.id === id)
  }

  function handleRefresh() {
    logger.info("DashboardPage", "Manual refresh triggered")
    qc.invalidateQueries({ queryKey: ["dashboard"] })
    qc.invalidateQueries({ queryKey: ["activity"] })
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight:700 }}>
            {greeting()}, {user?.firstName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here's what's happening at the firm today.
          </Typography>
        </Box>
        <Box sx={{ display:"flex", gap:1 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={() => setCustOpen(true)}
          >
            Customise
          </Button>
        </Box>
      </Box>

      {/* Onboarding checklist — shows until dismissed */}
      <OnboardingChecklist
        counts={{
          clients:  counts?.totalLeads ?? 0,
          matters:  counts?.totalMatters ?? 0,
          users:    2,
          invoices: 3,
        }}
      />

      {/* KPI cards */}
      {isVisible("kpi") && (
        <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:2, mb:3 }}>
          <KpiCard title="Total Leads"   value={counts?.totalLeads}   sub={`${counts?.openLeads??0} open`}  loading={l1} />
          <KpiCard title="Open Matters"  value={counts?.openMatters}  loading={l1} />
          <KpiCard title="Total Matters" value={counts?.totalMatters} loading={l1} />
          <KpiCard title="Pending Tasks" value={counts?.pendingTasks}
            sub={counts?.overdueTasks ? `${counts.overdueTasks} overdue` : undefined} loading={l1} />
        </Box>
      )}

      {/* Charts row */}
      {(isVisible("matters") || isVisible("revenue")) && (
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"1fr 1fr" }, gap:2, mb:3 }}>
          {isVisible("matters") && (
            <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight:600, mb:1.5 }}>Matter Activity (Monthly)</Typography>
              {l2 ? <Skeleton height={200} /> : matData.length > 0 && (
                <ApexChart type="area" height={200}
                  series={[{ name:"Matters", data:matData }]}
                  options={{ chart:{toolbar:{show:false}}, xaxis:{categories:months}, stroke:{curve:"smooth",width:2}, fill:{type:"gradient"}, dataLabels:{enabled:false}, colors:["#0F3C6E"], grid:{strokeDashArray:4} }}
                />
              )}
            </Paper>
          )}
          {isVisible("revenue") && (
            <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight:600, mb:1.5 }}>Revenue Breakdown (Monthly)</Typography>
              {l3 ? <Skeleton height={200} /> : revMon.length > 0 && (
                <ApexChart type="bar" height={200}
                  series={[{ name:"Fixed Fees", data:fixed },{ name:"Time Logs", data:tlogs }]}
                  options={{ chart:{toolbar:{show:false}}, xaxis:{categories:revMon}, colors:["#0F3C6E","#00B4A6"], dataLabels:{enabled:false}, plotOptions:{bar:{borderRadius:4,columnWidth:"55%"}}, grid:{strokeDashArray:4} }}
                />
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* Activity feed */}
      {isVisible("activity") && <ActivityFeed limit={8} />}

      {/* Customise drawer */}
      <DashboardCustomiser open={custOpen} onClose={() => setCustOpen(false)} />
    </Box>
  )
}
