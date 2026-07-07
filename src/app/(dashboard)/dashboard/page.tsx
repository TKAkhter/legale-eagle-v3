import { Box, Typography, Paper, Skeleton } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { ApexChart } from '@components/charts/ApexChart'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { ChartEmptyState } from '@components/ui/ChartEmptyState'
import { DashboardSetup } from './_components/DashboardSetup'

function KpiCard({ title, value, loading, prefix = '', suffix = '' }: { title: string; value?: number | string; loading: boolean; prefix?: string; suffix?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
      {loading
        ? <Skeleton width={80} height={40} />
        : <Typography variant="h4" sx={{ fontWeight: 700 }}>{prefix}{value ?? 0}{suffix}</Typography>
      }
    </Paper>
  )
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>{title}</Typography>
      {loading ? <Skeleton variant="rounded" height={200} /> : children}
    </Paper>
  )
}

export default function DashboardPage() {
  const { data: leads,   isLoading: l1 } = useQuery({ queryKey: QK.dashboard.leadCount(),   queryFn: () => axiosClient.get('/api/dashboard/lead/count').then(r => r.data?.data ?? r.data) })
  const { data: matters, isLoading: l2 } = useQuery({ queryKey: QK.dashboard.matterCount(), queryFn: () => axiosClient.get('/api/dashboard/matter/count').then(r => r.data?.data ?? r.data) })
  const { data: tasks,   isLoading: l3 } = useQuery({ queryKey: QK.dashboard.taskCount(),   queryFn: () => axiosClient.get('/api/dashboard/task/count').then(r => r.data?.data ?? r.data) })

  const { data: matterHistory, isLoading: ch1 } = useQuery({
    queryKey: QK.dashboard.charts('matterHistory'),
    queryFn: () => axiosClient.get('/api/analytics/graph/matters-history-monthly').then(r => r.data?.data ?? r.data),
  })

  const { data: timelogSummary, isLoading: ch2 } = useQuery({
    queryKey: QK.dashboard.charts('timelogSummary'),
    queryFn: () => axiosClient.get('/api/analytics/graph/timelogs-summary-per-category').then(r => r.data?.data ?? r.data),
  })

  const { data: revenueData, isLoading: ch3 } = useQuery({
    queryKey: QK.dashboard.charts('revenue'),
    queryFn: () => axiosClient.get('/api/analytics/graph/fixedfees-timelogs-revenue').then(r => r.data?.data ?? r.data),
  })

  const { data: upcomingHearings, isLoading: l4 } = useQuery({
    queryKey: QK.dashboard.upcomingHearings(),
    queryFn: () => axiosClient.get('/api/analytics/dashboard/my-upcoming-hearing-today-and-tomorrow').then(r => r.data?.data ?? r.data ?? []),
  })

  // Build chart series from API data
  const matterHistoryMonths = Array.isArray(matterHistory) ? matterHistory.map((d: Record<string,unknown>) => String(d.month ?? d.label ?? '')) : []
  const matterHistoryCounts = Array.isArray(matterHistory) ? matterHistory.map((d: Record<string,unknown>) => Number(d.count ?? d.value ?? 0)) : []

  const timelogCategories = Array.isArray(timelogSummary) ? timelogSummary.map((d: Record<string,unknown>) => String(d.category ?? d.label ?? '')) : []
  const timelogHours      = Array.isArray(timelogSummary) ? timelogSummary.map((d: Record<string,unknown>) => Number(d.hours ?? d.value ?? 0)) : []

  const revenueLabels = Array.isArray(revenueData) ? revenueData.map((d: Record<string,unknown>) => String(d.month ?? d.label ?? '')) : []
  const fixedFees     = Array.isArray(revenueData) ? revenueData.map((d: Record<string,unknown>) => Number(d.fixedFees ?? 0)) : []
  const timelogs      = Array.isArray(revenueData) ? revenueData.map((d: Record<string,unknown>) => Number(d.timelogs ?? 0)) : []

  return (
    <Box>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:3 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>Dashboard</Typography>
        <DashboardSetup />
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        <KpiCard title="Total Leads"    value={leads?.totalLeads}       loading={l1} />
        <KpiCard title="Open Leads"     value={leads?.openLeads}        loading={l1} />
        <KpiCard title="Open Matters"   value={matters?.openMatters}    loading={l2} />
        <KpiCard title="Total Matters"  value={matters?.totalMatters}   loading={l2} />
        <KpiCard title="Pending Tasks"  value={tasks?.pendingTasks}     loading={l3} />
        <KpiCard title="Overdue Tasks"  value={tasks?.overdueTasks}     loading={l3} />
      </Box>

      {/* Charts row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <ChartCard title="Matter Activity (Monthly)" loading={ch1}>
          {matterHistoryCounts.length > 0 ? (
            <ApexChart
              type="area" height={200}
              series={[{ name: 'Matters', data: matterHistoryCounts }]}
              options={{ chart: { toolbar: { show: false }, sparkline: { enabled: false } }, xaxis: { categories: matterHistoryMonths }, stroke: { curve: 'smooth', width: 2 }, fill: { type: 'gradient' }, dataLabels: { enabled: false }, colors: ['#0F3C6E'], grid: { strokeDashArray: 4 } }}
            />
          ) : <ChartEmptyState />}
        </ChartCard>

        <ChartCard title="Revenue Breakdown (Monthly)" loading={ch3}>
          {revenueLabels.length > 0 ? (
            <ApexChart
              type="bar" height={200}
              series={[{ name: 'Fixed Fees', data: fixedFees }, { name: 'Time Logs', data: timelogs }]}
              options={{ chart: { toolbar: { show: false }, stacked: false }, xaxis: { categories: revenueLabels }, colors: ['#0F3C6E','#00B4A6'], dataLabels: { enabled: false }, plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } }, grid: { strokeDashArray: 4 } }}
            />
          ) : <ChartEmptyState />}
        </ChartCard>
      </Box>

      {/* Timelog breakdown donut + Upcoming hearings */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <ChartCard title="Time Log Categories" loading={ch2}>
          {timelogHours.length > 0 ? (
            <ApexChart
              type="donut" height={220}
              series={timelogHours}
              options={{ labels: timelogCategories, colors: ['#0F3C6E','#00B4A6','#365E92','#33C7BB','#08254A'], legend: { position: 'bottom' }, dataLabels: { enabled: true } }}
            />
          ) : <ChartEmptyState />}
        </ChartCard>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Upcoming Hearings</Typography>
          {l4 ? <Skeleton variant="rounded" height={150} /> :
            Array.isArray(upcomingHearings) && upcomingHearings.length > 0
              ? (upcomingHearings as Record<string,string>[]).slice(0, 5).map((h, i) => (
                <Box key={i} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.caseNo ?? h.matterTitle ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{h.hearingDate ?? ''} {h.hearingTime ?? ''}</Typography>
                </Box>
              ))
              : <Typography variant="body2" color="text.secondary">No upcoming hearings today or tomorrow.</Typography>
          }
        </Paper>
      </Box>
    </Box>
  )
}
