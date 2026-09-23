import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Chip, Button } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ApexChart } from "@components/charts/ApexChart"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@components/filters/ReportFilterPanel"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true, showDateRange: true })

export default function MatterBillingReportPage() {
  const { data: summary } = useQuery({
    queryKey: ["reports", "matter-billing", "summary"],
    queryFn: () => reportsApi.getMatterBilling({ page: 0, pageSize: 20, sortBy: "totalBilled", sortDir: "desc", filters: {} }),
  })
  const rows = (summary?.content ?? []) as Record<string, unknown>[]
  const top5 = rows.slice(0, 5)

  async function emailExcel() {
    try {
      toast.success(await reportsApi.requestMatterBillingExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <PageShell
      title="Matter Billing Report"
      description="Billing summary per matter"
      action={(
        <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>
          Email Excel
        </Button>
      )}
    >
      {top5.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Top 5 Matters by Billing</Typography>
            <ApexChart
              type="bar"
              height={200}
              series={[{ name: "Billed (AED)", data: top5.map(r => Number(r.totalBilled ?? r.totalBilledAmount ?? 0)) }]}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: top5.map(r => String(r.matterTitle ?? r.title ?? "")), labels: { style: { fontSize: "10px" } } },
                colors: ["#0F3C6E"],
                dataLabels: { enabled: false },
                plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", horizontal: false } },
                grid: { strokeDashArray: 4 },
                yaxis: { labels: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Billing by Type</Typography>
            <ApexChart
              type="donut"
              height={200}
              series={(() => {
                const byType: Record<string, number> = {}
                rows.forEach(r => { const t = String(r.billingType ?? "Other"); byType[t] = (byType[t] ?? 0) + Number(r.totalBilled ?? r.totalBilledAmount ?? 0) })
                return Object.values(byType)
              })()}
              options={{
                labels: (() => { const byType: Record<string, number> = {}; rows.forEach(r => { const t = String(r.billingType ?? "Other"); byType[t] = (byType[t] ?? 0) + 1 }); return Object.keys(byType) })(),
                colors: ["#0F3C6E", "#00B4A6", "#F59E0B", "#7C3AED"],
                legend: { position: "bottom" },
                dataLabels: { enabled: true },
                plotOptions: { pie: { donut: { size: "65%" } } },
              }}
            />
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field: "matterTitle", header: "Matter", sortKey: "matterTitle", renderCell: (v, row) => String(v || (row as Record<string, unknown>).title || "—") },
          { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
          { field: "agreementNo", header: "Agreement No.", renderCell: v => String(v || "—") },
          { field: "billingType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
          { field: "totalBilledAmount", header: "Total Billed", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).totalBilled ?? 0)) },
          { field: "creditNoteAmount", header: "Credit Note", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "totalNetAmount", header: "Net Amount", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).totalPaid ?? 0)) },
          { field: "matterStatus", header: "Status", renderCell: (v, row) => <StatusBadge status={String(v || (row as Record<string, unknown>).status || "")} /> },
        ]}
        queryKey={["reports", "matter-billing"]}
        queryFn={(p: GridParams) => reportsApi.getMatterBilling(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="totalBilled"
        defaultSortDir="desc"
      />
    </PageShell>
  )
}
