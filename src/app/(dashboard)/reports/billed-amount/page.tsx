import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, LinearProgress } from "@mui/material"
import { PageShell }     from "@/components/ui/PageShell"
import { DataGrid }      from "@/components/data-grid/DataGrid"
import { ApexChart }     from "@components/charts/ApexChart"
import { reportsApi }    from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"

export default function BilledAmountReportPage() {
  const { data: summary } = useQuery({
    queryKey: ["reports","billed-amount","summary"],
    queryFn: () => reportsApi.getDepartmentBilling({ page:0, pageSize:100, sortBy:"totalBilled", sortDir:"desc", filters:{} }),
  })
  const rows = (summary?.content ?? []) as Record<string,unknown>[]

  return (
    <PageShell title="Billed Amount by Department" description="Billing breakdown per practice area">
      {/* Charts row */}
      {rows.length > 0 && (
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, mb:3 }}>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Billed vs Paid</Typography>
            <ApexChart type="bar" height={200}
              series={[
                { name:"Billed", data: rows.map(r=>Number(r.totalBilled??0)) },
                { name:"Paid",   data: rows.map(r=>Number(r.totalPaid??0))   },
              ]}
              options={{ chart:{toolbar:{show:false}}, xaxis:{ categories: rows.map(r=>String(r.departmentName??"")), labels:{style:{fontSize:"11px"}} }, colors:["#0F3C6E","#00B4A6"], dataLabels:{enabled:false}, plotOptions:{bar:{borderRadius:4, columnWidth:"60%"}}, grid:{strokeDashArray:4}, yaxis:{ labels:{ formatter:(v:number)=>`${(v/1000).toFixed(0)}K` } } }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Outstanding by Department</Typography>
            <ApexChart type="donut" height={200}
              series={rows.filter(r=>Number(r.outstanding??0)>0).map(r=>Number(r.outstanding??0))}
              options={{ labels: rows.filter(r=>Number(r.outstanding??0)>0).map(r=>String(r.departmentName??"")), colors:["#DC2626","#F59E0B","#EA580C","#7C3AED"], legend:{position:"bottom"}, dataLabels:{enabled:true}, plotOptions:{pie:{donut:{size:"65%"}}} }}
            />
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field:"departmentName", header:"Department", sortKey:"departmentName" },
          { field:"totalBilled",    header:"Total Billed",   align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"totalPaid",      header:"Paid",           align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"outstanding",    header:"Outstanding",    align:"right", renderCell:(v)=><Typography variant="body2" sx={{ color:Number(v)>0?"error.main":"success.main", fontWeight:600 }}>{formatCurrency(Number(v??0))}</Typography> },
        ]}
        queryKey={["reports","billed-amount"]}
        queryFn={(p:GridParams) => reportsApi.getDepartmentBilling(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        defaultSortBy="totalBilled" defaultSortDir="desc"
      />
    </PageShell>
  )
}
