import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography } from "@mui/material"
import { PageShell }      from "@/components/ui/PageShell"
import { DataGrid }       from "@/components/data-grid/DataGrid"
import { ApexChart }      from "@components/charts/ApexChart"
import { reportsApi }     from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"

export default function CollectionsReportPage() {
  const { data: summary } = useQuery({
    queryKey: ["reports","collections","summary"],
    queryFn: () => reportsApi.getCollections({ page:0, pageSize:100, sortBy:"collectionRate", sortDir:"desc", filters:{} }),
  })
  const rows = (summary?.content ?? []) as Record<string,unknown>[]

  return (
    <PageShell title="Collections Report" description="Invoice collection rates by client">
      {rows.length > 0 && (
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, mb:3 }}>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Collection Rate by Client</Typography>
            <ApexChart type="bar" height={200}
              series={[{ name:"Rate %", data: rows.map(r=>Number(r.collectionRate??0)) }]}
              options={{ chart:{toolbar:{show:false}}, xaxis:{ categories: rows.map(r=>String(r.clientName??"")), labels:{style:{fontSize:"11px"}} }, colors:["#00B4A6"], dataLabels:{enabled:false}, plotOptions:{bar:{borderRadius:4,columnWidth:"55%"}}, grid:{strokeDashArray:4}, yaxis:{ max:100, labels:{ formatter:(v:number)=>`${v.toFixed(0)}%` } } }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Invoiced vs Collected</Typography>
            <ApexChart type="bar" height={200}
              series={[
                { name:"Invoiced",  data: rows.map(r=>Number(r.totalInvoiced??0)) },
                { name:"Collected", data: rows.map(r=>Number(r.totalPaid??0))     },
              ]}
              options={{ chart:{toolbar:{show:false},type:"bar"}, xaxis:{ categories: rows.map(r=>String(r.clientName??"")), labels:{style:{fontSize:"11px"}} }, colors:["#0F3C6E","#22C55E"], dataLabels:{enabled:false}, plotOptions:{bar:{borderRadius:4,columnWidth:"60%"}}, grid:{strokeDashArray:4}, yaxis:{ labels:{ formatter:(v:number)=>`${(v/1000).toFixed(0)}K` } } }}
            />
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field:"clientName",     header:"Client",          sortKey:"clientName" },
          { field:"totalInvoiced",  header:"Total Invoiced",  align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"totalPaid",      header:"Collected",       align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"collectionRate", header:"Rate",            align:"right", renderCell:(v)=><Typography variant="body2" sx={{ color:Number(v)<50?"error.main":Number(v)<80?"warning.main":"success.main", fontWeight:600 }}>{Number(v??0).toFixed(1)}%</Typography> },
          { field:"outstanding",    header:"Outstanding",     align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
        ]}
        queryKey={["reports","collections"]}
        queryFn={(p:GridParams) => reportsApi.getCollections(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        defaultSortBy="collectionRate" defaultSortDir="desc"
      />
    </PageShell>
  )
}
