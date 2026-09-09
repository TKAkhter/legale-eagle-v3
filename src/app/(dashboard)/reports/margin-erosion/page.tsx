import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Chip } from "@mui/material"
import { PageShell }      from "@/components/ui/PageShell"
import { DataGrid }       from "@/components/data-grid/DataGrid"
import { ApexChart }      from "@components/charts/ApexChart"
import { reportsApi }     from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"

export default function MarginErosionPage() {
  const { data: summary } = useQuery({
    queryKey: ["reports","margin-erosion","summary"],
    queryFn: () => reportsApi.getMarginErosion({ page:0, pageSize:100, sortBy:"marginRate", sortDir:"asc", filters:{} }),
  })
  const rows = (summary?.content ?? []) as Record<string,unknown>[]
  const avgMargin = rows.length ? rows.reduce((s,r)=>s+Number(r.marginRate??0),0)/rows.length : 0

  return (
    <PageShell title="Margin Erosion Report" description="Profitability and margin by matter">
      {rows.length > 0 && (
        <Box sx={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:2, mb:3 }}>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Margin Rate by Matter (%)</Typography>
            <ApexChart type="bar" height={200}
              series={[{ name:"Margin %", data: rows.map(r=>Number(r.marginRate??0)) }]}
              options={{ chart:{toolbar:{show:false}}, xaxis:{ categories: rows.map(r=>String(r.matterTitle??"")), labels:{style:{fontSize:"10px"}} }, colors:[ ...rows.map(r=>Number(r.marginRate??0)<40?"#DC2626":Number(r.marginRate??0)<60?"#F59E0B":"#22C55E") ], dataLabels:{enabled:false}, plotOptions:{bar:{borderRadius:4,columnWidth:"55%",distributed:true}}, legend:{show:false}, grid:{strokeDashArray:4}, yaxis:{ max:100, labels:{ formatter:(v:number)=>`${v.toFixed(0)}%` } }, annotations:{ yaxis:[{ y:avgMargin, borderColor:"#0F3C6E", label:{ text:`Avg ${avgMargin.toFixed(1)}%`, style:{color:"#fff",background:"#0F3C6E"} } }] } }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight:700, textTransform:"uppercase", fontSize:10, letterSpacing:"0.08em" }}>Average Margin</Typography>
            <Typography variant="h2" sx={{ fontWeight:800, color: avgMargin<40?"error.main":avgMargin<60?"warning.main":"success.main" }}>{avgMargin.toFixed(1)}%</Typography>
            <Chip size="small" label={avgMargin<40?"Below Target":avgMargin<60?"Acceptable":"Healthy"} color={avgMargin<40?"error":avgMargin<60?"warning":"success"} />
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field:"matterTitle",  header:"Matter" },
          { field:"billedAmount", header:"Billed",       align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"cost",         header:"Cost",         align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"margin",       header:"Margin",       align:"right", renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:"marginRate",   header:"Margin %",     align:"right", renderCell:(v)=><Typography variant="body2" sx={{ color:Number(v)<40?"error.main":Number(v)<60?"warning.main":"success.main", fontWeight:600 }}>{Number(v??0).toFixed(1)}%</Typography> },
          { field:"billingType",  header:"Type",         renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined" /> },
        ]}
        queryKey={["reports","margin-erosion"]}
        queryFn={(p:GridParams) => reportsApi.getMarginErosion(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        defaultSortBy="marginRate" defaultSortDir="asc"
        zebraStriping
      />
    </PageShell>
  )
}
