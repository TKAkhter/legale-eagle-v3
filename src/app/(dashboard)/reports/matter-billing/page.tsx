import { useTranslation } from 'react-i18next'
import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Chip } from "@mui/material"
import { PageShell }      from "@/components/ui/PageShell"
import { DataGrid }       from "@/components/data-grid/DataGrid"
import { ApexChart }      from "@/components/charts/ApexChart"
import { StatusBadge }    from "@/components/ui/StatusBadge"
import { reportsApi }     from "@/api/reports"
import { formatCurrency } from "@/lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"

export default function MatterBillingReportPage() {
  const { t } = useTranslation()
  const { data: summary } = useQuery({
    queryKey: ["reports","matter-billing","summary"],
    queryFn: () => reportsApi.getMatterBilling({ page:0, pageSize:20, sortBy:"totalBilled", sortDir:"desc", filters:{} }),
  })
  const rows = (summary?.content ?? []) as Record<string,unknown>[]
  const top5 = rows.slice(0, 5)

  return (
    <PageShell title={t("nav.reports-matter-billing", "Matter Billing Report")} description="Billing summary per matter">
      {top5.length > 0 && (
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, mb:3 }}>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Top 5 Matters by Billing</Typography>
            <ApexChart type="bar" height={200}
              series={[{ name:"Billed (AED)", data: top5.map(r=>Number(r.totalBilled??0)) }]}
              options={{
                chart:{ toolbar:{ show:false } },
                xaxis:{ categories: top5.map(r=>String(r.matterTitle??r.title??"")), labels:{ style:{ fontSize:"10px" } } },
                colors:["#0F3C6E"],
                dataLabels:{ enabled:false },
                plotOptions:{ bar:{ borderRadius:4, columnWidth:"55%", horizontal:false } },
                grid:{ strokeDashArray:4 },
                yaxis:{ labels:{ formatter:(v:number)=>`${(v/1000).toFixed(0)}K` } },
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Billing by Type</Typography>
            <ApexChart type="donut" height={200}
              series={(() => {
                const byType: Record<string,number> = {}
                rows.forEach(r => { const t=String(r.billingType??"Other"); byType[t]=(byType[t]??0)+Number(r.totalBilled??0) })
                return Object.values(byType)
              })()}
              options={{
                labels: (() => { const byType: Record<string,number>={}; rows.forEach(r=>{const t=String(r.billingType??"Other");byType[t]=(byType[t]??0)+1}); return Object.keys(byType) })(),
                colors:["#0F3C6E","#00B4A6","#F59E0B","#7C3AED"],
                legend:{ position:"bottom" },
                dataLabels:{ enabled:true },
                plotOptions:{ pie:{ donut:{ size:"65%" } } },
              }}
            />
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field:"matterTitle",  header:"Matter",       sortKey:"matterTitle" },
          { field:"clientName",   header:"Client" },
          { field:"billingType",  header:"Type",         renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined" /> },
          { field:"totalBilled",  header:"Total Billed", align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"totalPaid",    header:"Paid",         align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"outstanding",  header:"Outstanding",  align:"right", renderCell:(v)=><Typography variant="body2" sx={{ color:Number(v)>0?"error.main":"success.main", fontWeight:600 }}>{formatCurrency(Number(v??0))}</Typography> },
          { field:"matterStatus", header:"Status",       renderCell:(v)=><StatusBadge status={String(v??"")} /> },
        ]}
        queryKey={["reports","matter-billing"]}
        queryFn={(p:GridParams) => reportsApi.getMatterBilling(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        defaultSortBy="totalBilled" defaultSortDir="desc"
      />
    </PageShell>
  )
}
