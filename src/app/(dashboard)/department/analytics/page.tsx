/**
 * Department Analytics — LMS `/department/analytics` (My + Department tabs).
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { DataGrid } from "@/components/data-grid/DataGrid"
import type { ColumnDef } from "@/components/data-grid/types"
import { ApexChart } from "@components/charts/ApexChart"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"
import {
  analyticsDashboardApi,
  buildDepartmentMatterChart,
  buildDepartmentTaskChart,
  buildDepartmentTimeLogChart,
  buildMyOpenSleepingChart,
  buildMyTaskChart,
  buildMyTimeLogChart,
  mapFavouriteClient,
  mapOpenLead,
  type AnalyticsClientRow,
  type AnalyticsLeadRow,
} from "@/api/analyticsDashboard"
import { env } from "@/config/env"

function ChartCard({
  title,
  loading,
  empty,
  children,
}: {
  title: string
  loading: boolean
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {loading ? <PanelLoader label="Loading…" /> : empty ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No data available</Typography>
      ) : children}
    </Paper>
  )
}

const favClientColumns: ColumnDef<AnalyticsClientRow>[] = [
  { field: "clientName", header: "Client Name" },
  { field: "email", header: "Email" },
  { field: "telephone", header: "Telephone", width: 140 },
  { field: "latestMatter", header: "Latest Matter" },
]

const openLeadColumns: ColumnDef<AnalyticsLeadRow>[] = [
  { field: "leadName", header: "Lead Name" },
  { field: "email", header: "Email" },
  { field: "telephone", header: "Telephone", width: 140 },
  { field: "practiceArea", header: "Practice Area" },
]

export default function DepartmentAnalyticsPage() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const showDepartment = Boolean(
    user?.hod
    || user?.roles?.includes("ROLE_ADMIN")
    || user?.roles?.includes("ROLE_SUB_ADMIN"),
  )

  const myTasks = useQuery({
    queryKey: ["analytics", "my-tasks"],
    queryFn: () => analyticsDashboardApi.pendingOverdueTasks(),
    enabled: tab === 0,
  })
  const myMatters = useQuery({
    queryKey: ["analytics", "my-matters"],
    queryFn: () => analyticsDashboardApi.myOpenSleepingMatters(),
    enabled: tab === 0,
  })
  const myTime = useQuery({
    queryKey: ["analytics", "my-time"],
    queryFn: () => analyticsDashboardApi.myTimeLogEntries(),
    enabled: tab === 0,
  })
  const deptTasks = useQuery({
    queryKey: ["analytics", "dept-tasks"],
    queryFn: () => analyticsDashboardApi.departmentTasks(),
    enabled: showDepartment && tab === 1,
  })
  const deptTime = useQuery({
    queryKey: ["analytics", "dept-time"],
    queryFn: () => analyticsDashboardApi.departmentTimeLogs(),
    enabled: showDepartment && tab === 1,
  })
  const deptMatters = useQuery({
    queryKey: ["analytics", "dept-matters"],
    queryFn: () => analyticsDashboardApi.departmentMatters(),
    enabled: showDepartment && tab === 1,
  })

  const myTaskChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return {
        categories: ["Pending", "Overdue", "UpComing"],
        series: [{ name: "Tasks", data: [12, 4, 7] }],
      }
    }
    return buildMyTaskChart(myTasks.data ?? [])
  }, [myTasks.data])

  const myMatterChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return {
        categories: ["Matters"],
        series: [
          { name: "Open Matters", data: [8] },
          { name: "Idle Matters", data: [2] },
        ],
      }
    }
    return buildMyOpenSleepingChart(myMatters.data ?? [])
  }, [myMatters.data])

  const myTimeChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return {
        categories: ["Sep 1", "Sep 2", "Sep 3", "Sep 4"],
        series: [
          { name: "Me", data: [5, 7, 6, 8] },
          { name: "Expected", data: [7, 7, 7, 7] },
        ],
      }
    }
    return buildMyTimeLogChart(myTime.data ?? [])
  }, [myTime.data])

  const deptTaskChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return {
        categories: ["Sarah", "James", "Dory"],
        series: [
          { name: "Pending", data: [3, 5, 2] },
          { name: "OverDue", data: [1, 0, 2] },
          { name: "To Approve", data: [2, 1, 0] },
        ],
      }
    }
    return buildDepartmentTaskChart(deptTasks.data ?? [])
  }, [deptTasks.data])

  const deptTimeChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return { categories: ["Sarah", "James"], series: [{ name: "Hours", data: [42, 35] }] }
    }
    return buildDepartmentTimeLogChart(deptTime.data ?? [])
  }, [deptTime.data])

  const deptMatterChart = useMemo(() => {
    if (env.USE_STATIC_DATA) {
      return {
        categories: ["Sarah", "James"],
        series: [
          { name: "Open", data: [8, 5] },
          { name: "Sleeping", data: [1, 2] },
        ],
      }
    }
    return buildDepartmentMatterChart(deptMatters.data ?? [])
  }, [deptMatters.data])

  return (
    <PageShell title="Department Analytics" description="Personal and department task, time, and matter analytics">
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="My" />
        {showDepartment && <Tab label="Department" />}
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <ChartCard
            title="My Tasks"
            loading={myTasks.isLoading && !env.USE_STATIC_DATA}
            empty={!myTaskChart.categories.length}
          >
            <ApexChart
              type="bar"
              height={280}
              series={myTaskChart.series}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: myTaskChart.categories },
                dataLabels: { enabled: false },
                plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
              }}
            />
          </ChartCard>

          <ChartCard
            title="Open vs Idle Matters"
            loading={myMatters.isLoading && !env.USE_STATIC_DATA}
            empty={!myMatterChart.categories.length}
          >
            <ApexChart
              type="bar"
              height={280}
              series={myMatterChart.series}
              options={{
                chart: { stacked: true, toolbar: { show: false } },
                xaxis: { categories: myMatterChart.categories },
                legend: { position: "top" },
                dataLabels: { enabled: false },
              }}
            />
          </ChartCard>

          <ChartCard
            title="Time Log Entries"
            loading={myTime.isLoading && !env.USE_STATIC_DATA}
            empty={!myTimeChart.categories.length}
          >
            <ApexChart
              type="area"
              height={280}
              series={myTimeChart.series}
              options={{
                chart: { toolbar: { show: false } },
                stroke: { curve: "smooth" },
                xaxis: { categories: myTimeChart.categories },
                dataLabels: { enabled: false },
                legend: { position: "top" },
              }}
            />
          </ChartCard>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, gridColumn: { md: "1 / -1" } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Favorite Clients</Typography>
            <DataGrid<AnalyticsClientRow>
              columns={favClientColumns}
              queryKey={["analytics", "fav-clients"]}
              queryFn={async (params: GridParams) => {
                if (env.USE_STATIC_DATA) {
                  return {
                    content: [
                      mapFavouriteClient({
                        clientId: "c1",
                        clientName: "Acme Corp",
                        email: "a@acme.com",
                        telephone: "555-0100",
                        latestMatter: "Contract Review",
                      }),
                    ],
                    totalElements: 1,
                    totalPages: 1,
                    number: 0,
                    size: 5,
                    first: true,
                    last: true,
                    empty: false,
                  }
                }
                const page = await analyticsDashboardApi.favouriteClients(params.page, params.pageSize)
                return {
                  ...page,
                  content: page.content.map(mapFavouriteClient),
                }
              }}
              defaultPageSize={5}
              defaultSortBy="clientName"
              syncWithUrl={false}
              onRowClick={row => navigate(`/clients/${row.clientId}`)}
              emptyState={<Typography color="text.secondary">No favorite clients</Typography>}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, gridColumn: { md: "1 / -1" } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Open Leads</Typography>
            <DataGrid<AnalyticsLeadRow>
              columns={openLeadColumns}
              queryKey={["analytics", "open-leads"]}
              queryFn={async (params: GridParams) => {
                if (env.USE_STATIC_DATA) {
                  return {
                    content: [
                      mapOpenLead({
                        leadId: "l1",
                        leadName: "Jane Prospect",
                        email: "jane@ex.com",
                        telephone: "555-0200",
                        practiceArea: "Corporate",
                      }),
                    ],
                    totalElements: 1,
                    totalPages: 1,
                    number: 0,
                    size: 5,
                    first: true,
                    last: true,
                    empty: false,
                  }
                }
                const page = await analyticsDashboardApi.myOpenLeads(params.page, params.pageSize)
                return {
                  ...page,
                  content: page.content.map(mapOpenLead),
                }
              }}
              defaultPageSize={5}
              defaultSortBy="leadName"
              syncWithUrl={false}
              onRowClick={row => navigate(`/leads/${row.leadId}`)}
              emptyState={<Typography color="text.secondary">No open leads</Typography>}
            />
          </Paper>
        </Box>
      )}

      {showDepartment && tab === 1 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <ChartCard
            title="Department Tasks"
            loading={deptTasks.isLoading && !env.USE_STATIC_DATA}
            empty={!deptTaskChart.categories.length}
          >
            <ApexChart
              type="bar"
              height={320}
              series={deptTaskChart.series}
              options={{
                chart: { stacked: true, toolbar: { show: false } },
                xaxis: { categories: deptTaskChart.categories },
                legend: { position: "top" },
                dataLabels: { enabled: false },
              }}
            />
          </ChartCard>
          <ChartCard
            title="Department Time Logs (This Month)"
            loading={deptTime.isLoading && !env.USE_STATIC_DATA}
            empty={!deptTimeChart.categories.length}
          >
            <ApexChart
              type="bar"
              height={320}
              series={deptTimeChart.series}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: deptTimeChart.categories },
                dataLabels: { enabled: false },
              }}
            />
          </ChartCard>
          <ChartCard
            title="Open vs Sleeping Matters"
            loading={deptMatters.isLoading && !env.USE_STATIC_DATA}
            empty={!deptMatterChart.categories.length}
          >
            <ApexChart
              type="bar"
              height={320}
              series={deptMatterChart.series}
              options={{
                chart: { stacked: false, toolbar: { show: false } },
                xaxis: { categories: deptMatterChart.categories },
                legend: { position: "top" },
                dataLabels: { enabled: false },
              }}
            />
          </ChartCard>
        </Box>
      )}
    </PageShell>
  )
}
