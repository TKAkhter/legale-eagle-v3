import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Chip, Button, CircularProgress, Link as MuiLink } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ApexChart } from "@components/charts/ApexChart"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@components/filters/ReportFilterPanel"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true, showDateRange: true })

/** Nested invoice list for a matter billing row (LMS invoices-breakdown). */
function MatterInvoiceBreakdown({ row }: { row: Record<string, unknown> }) {
  const matterId = String(row.matterId ?? row.id ?? "")
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", "matter-billing", "invoices-breakdown", matterId],
    queryFn: () => reportsApi.getMatterBillingInvoicesBreakdown(matterId, {
      clientId: row.clientId ?? "",
      lfaId: row.lfaId ?? row.agreementId ?? "",
    }),
    enabled: !!matterId,
  })
  const invoices = data?.content ?? []

  if (!matterId) {
    return <Typography variant="body2" color="text.secondary">No matter id for breakdown</Typography>
  }
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading invoices…</Typography>
      </Box>
    )
  }
  if (isError) {
    return <Typography variant="body2" color="error">Failed to load invoice breakdown</Typography>
  }
  if (!invoices.length) {
    return <Typography variant="body2" color="text.secondary">No invoices for this matter</Typography>
  }

  return (
    <Box sx={{ py: 0.5, overflowX: "auto" }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
        Invoices · {String(row.matterTitle ?? row.title ?? matterId)}
      </Typography>
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          "& th, & td": { textAlign: "left", py: 0.5, px: 1, borderBottom: "1px solid", borderColor: "divider" },
          "& th": { color: "text.secondary", fontWeight: 600, fontSize: 11, textTransform: "uppercase" },
          "& td.num": { textAlign: "right" },
        }}
      >
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Issue Date</th>
            <th>Status</th>
            <th className="num">Due</th>
            <th className="num">Credit Note</th>
            <th className="num">Write Off</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => {
            const r = inv as Record<string, unknown>
            const invId = String(r.id ?? "")
            const invNo = (() => {
              if (r.invoiceNo != null && String(r.invoiceNo)) return String(r.invoiceNo)
              const composed = `${r.invoicePrefix ?? ""}${r.invoiceNumber ?? ""}`
              return composed || "—"
            })()
            return (
              <tr key={invId || `${invNo}-${i}`}>
                <td>
                  {invId ? (
                    <MuiLink component={RouterLink} to={`/billings/${invId}`} underline="hover">
                      {invNo || invId}
                    </MuiLink>
                  ) : invNo || "—"}
                </td>
                <td>{r.issueDate ? formatDate(String(r.issueDate)) : "—"}</td>
                <td><StatusBadge status={String(r.status ?? "")} /></td>
                <td className="num">{formatCurrency(Number(r.dueAmount ?? 0))}</td>
                <td className="num">{formatCurrency(Number(r.creditNoteAmount ?? 0) - Number(r.creditNoteVatAmount ?? 0))}</td>
                <td className="num">{formatCurrency(Number(r.writeOffAmount ?? 0) - Number(r.writeOffVatAmount ?? 0))}</td>
              </tr>
            )
          })}
        </tbody>
      </Box>
    </Box>
  )
}

export default function MatterBillingReportPage() {
  const navigate = useNavigate()
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
      description="Billing summary per matter — expand a row for invoice breakdown"
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
        rowExpansion={{
          render: (row) => <MatterInvoiceBreakdown row={row as Record<string, unknown>} />,
        }}
        rowMenuItems={(row) => {
          const r = row as Record<string, unknown>
          const matterId = String(r.matterId ?? r.id ?? "")
          return matterId
            ? [{ label: "Open Matter", onClick: () => navigate(`/matters/${matterId}`) }]
            : []
        }}
      />
    </PageShell>
  )
}
