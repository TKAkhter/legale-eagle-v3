import { useMemo, useState } from "react"
import {
  Box, Button, Chip, Divider, Paper, Skeleton, Tab, Tabs, Typography,
} from "@mui/material"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ApexChart } from "@components/charts/ApexChart"
import { makeReportFilterPanel } from "@components/filters/ReportFilterPanel"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import { parseWipTab, wipPanels, type WipPanelConfig, type WipTabId } from "./_components/wipPanels"

const OverviewFilterPanel = makeReportFilterPanel({
  showUser: true,
  showDepartment: true,
  showMatter: true,
  showDateRange: true,
})

function KpiCard({
  label, value, sub, icon, loading,
}: {
  label: string
  value?: string
  sub?: string
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, display: "flex", alignItems: "flex-start", gap: 2 }}>
      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "primary.main", color: "white", display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        {loading ? <Skeleton width={100} height={32} /> : <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value ?? "—"}</Typography>}
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Paper>
  )
}

function WipReportPanel({ panel }: { panel: WipPanelConfig }) {
  const FilterPanel = useMemo(() => makeReportFilterPanel(panel.filters), [panel.filters])
  const [emailing, setEmailing] = useState(false)

  async function handleEmailExcel() {
    setEmailing(true)
    try {
      toast.success(await panel.emailExcelFn({}))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{panel.title}</Typography>
          <Typography variant="body2" color="text.secondary">{panel.description}</Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleEmailExcel() }}
        >
          Email Excel
        </Button>
      </Box>
      <DataGrid
        columns={panel.columns}
        queryKey={panel.queryKey}
        queryFn={panel.queryFn}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </Box>
  )
}

function OverviewPanel() {
  const { data: summary, isLoading: sl } = useQuery({
    queryKey: ["reports", "wip", "summary"],
    queryFn: () => reportsApi.wipSummary(),
    staleTime: 5 * 60_000,
  })
  const byUser = (summary as { byUser?: { name: string; amount: number }[] })?.byUser ?? []
  const byStatus = (summary as { byStatus?: { name: string; count: number }[] })?.byStatus ?? []

  async function emailExcel() {
    try {
      toast.success(await reportsApi.requestWipExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="outlined" size="small" startIcon={<MarkunreadOutlinedIcon />} onClick={() => { void emailExcel() }}>
          Email Excel
        </Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 2, mb: 3 }}>
        <KpiCard
          label="Total WIP Value"
          loading={sl}
          icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
          value={formatCurrency((summary as { totalWip?: number })?.totalWip ?? 0)}
          sub="Unbilled billable work"
        />
        <KpiCard
          label="Total WIP Hours"
          loading={sl}
          icon={<AccessTimeIcon sx={{ fontSize: 20 }} />}
          value={`${((summary as { totalHours?: number })?.totalHours ?? 0).toFixed(1)} hrs`}
          sub="Across all fee earners"
        />
      </Box>
      {!sl && byUser.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>WIP by Fee Earner</Typography>
            <ApexChart
              type="bar"
              height={200}
              series={[{ name: "Amount (AED)", data: byUser.map(u => u.amount) }]}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: byUser.map(u => u.name.split(" ")[0]) },
                colors: ["#0F3C6E"],
                dataLabels: { enabled: false },
                plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
                grid: { strokeDashArray: 4 },
                yaxis: { labels: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>WIP by Status</Typography>
            <ApexChart
              type="donut"
              height={200}
              series={byStatus.map(s => s.count)}
              options={{
                labels: byStatus.map(s => s.name),
                colors: ["#0F3C6E", "#00B4A6", "#22C55E", "#F59E0B"],
                legend: { position: "bottom" },
                dataLabels: { enabled: true },
                plotOptions: { pie: { donut: { size: "65%" } } },
              }}
            />
          </Paper>
        </Box>
      )}
      <Divider sx={{ mb: 2.5 }} />
      <DataGrid
        columns={[
          { field: "userName", header: "Fee Earner", sortKey: "userName" },
          { field: "matterTitle", header: "Matter", sortKey: "matterTitle" },
          { field: "activity", header: "Activity" },
          { field: "entryDate", header: "Date", sortKey: "entryDate", renderCell: v => v ? new Date(String(v)).toLocaleDateString("en-GB") : "—" },
          { field: "totalHours", header: "Hours", sortKey: "totalHours", align: "right", renderCell: v => `${Number(v ?? 0).toFixed(1)} hrs` },
          { field: "totalAmount", header: "Amount", sortKey: "totalAmount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "billingType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" sx={{ fontSize: 11 }} /> },
        ]}
        queryKey={["reports", "wip"]}
        queryFn={(p: GridParams) => reportsApi.getWip(p)}
        FilterPanel={OverviewFilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="entryDate"
        defaultSortDir="desc"
      />
    </Box>
  )
}

export default function WipReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseWipTab(searchParams.get("tab"))

  function setTab(next: WipTabId) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("tab", next)
    setSearchParams(nextParams, { replace: true })
  }

  const activePanel = wipPanels.find(p => p.id === tab)

  return (
    <PageShell
      title="WIP Reports"
      description="Work in Progress — Department, Attorney, and Matter views"
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v: WipTabId) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Overview" value="overview" />
          {wipPanels.map(p => (
            <Tab key={p.id} label={p.label} value={p.id} />
          ))}
        </Tabs>
      </Box>

      {tab === "overview" && <OverviewPanel />}
      {activePanel && <WipReportPanel key={activePanel.id} panel={activePanel} />}
    </PageShell>
  )
}
