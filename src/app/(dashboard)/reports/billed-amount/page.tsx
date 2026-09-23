import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Button } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ApexChart } from "@components/charts/ApexChart"
import { makeReportFilterPanel } from "@components/filters/ReportFilterPanel"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showUser: true, showDepartment: true, showDateRange: true })

export default function BilledAmountReportPage() {
  const [gridKey, setGridKey] = useState(0)
  const { data: summary } = useQuery({
    queryKey: ["reports", "billed-amount", "summary"],
    queryFn: () => reportsApi.getBilledAmount({ page: 0, pageSize: 100, sortBy: "totalBilled", sortDir: "desc", filters: {} }),
  })
  const rows = (summary?.content ?? []) as Record<string, unknown>[]

  async function emailExcel() {
    try {
      toast.success(await reportsApi.requestBilledAmountExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <PageShell
      title="Billed Amount"
      description="Fee-earner billed amounts for the selected period"
      action={(
        <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>
          Email Excel
        </Button>
      )}
    >
      {rows.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Billed vs Paid</Typography>
            <ApexChart
              type="bar"
              height={200}
              series={[
                { name: "Billed", data: rows.map(r => Number(r.totalBilled ?? 0)) },
                { name: "Paid", data: rows.map(r => Number(r.totalPaid ?? 0)) },
              ]}
              options={{
                chart: { toolbar: { show: false } },
                xaxis: { categories: rows.map(r => String(r.userName ?? r.departmentName ?? "")), labels: { style: { fontSize: "11px" } } },
                colors: ["#0F3C6E", "#00B4A6"],
                dataLabels: { enabled: false },
                plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
                grid: { strokeDashArray: 4 },
                yaxis: { labels: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Outstanding</Typography>
            <ApexChart
              type="donut"
              height={200}
              series={rows.filter(r => Number(r.outstanding ?? 0) > 0).map(r => Number(r.outstanding ?? 0))}
              options={{
                labels: rows.filter(r => Number(r.outstanding ?? 0) > 0).map(r => String(r.userName ?? r.departmentName ?? "")),
                colors: ["#DC2626", "#F59E0B", "#EA580C", "#7C3AED"],
                legend: { position: "bottom" },
                dataLabels: { enabled: true },
                plotOptions: { pie: { donut: { size: "65%" } } },
              }}
            />
          </Paper>
        </Box>
      )}
      <DataGrid
        key={gridKey}
        columns={[
          { field: "userName", header: "Fee Earner", renderCell: (v, row) => String(v || (row as Record<string, unknown>).departmentName || "—") },
          { field: "departmentName", header: "Department", renderCell: v => String(v || "—") },
          { field: "totalBilled", header: "Total Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "totalPaid", header: "Paid", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          {
            field: "outstanding",
            header: "Outstanding",
            align: "right",
            renderCell: v => (
              <Typography variant="body2" sx={{ color: Number(v) > 0 ? "error.main" : "success.main", fontWeight: 600 }}>
                {formatCurrency(Number(v ?? 0))}
              </Typography>
            ),
          },
        ]}
        queryKey={["reports", "billed-amount"]}
        queryFn={(p: GridParams) => reportsApi.getBilledAmount(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="totalBilled"
        defaultSortDir="desc"
      />
    </PageShell>
  )
}
