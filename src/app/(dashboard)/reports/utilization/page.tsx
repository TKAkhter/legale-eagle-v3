import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography } from "@mui/material"
import { PageShell }      from "@/components/ui/PageShell"
import { DataGrid }       from "@/components/data-grid/DataGrid"
import { ApexChart }      from "@components/charts/ApexChart"
import { reportsApi }     from "@/api/reports"
import type { GridParams } from "@/types/common.types"

export default function UtilizationReportPage() {
  const { data: summary } = useQuery({
    queryKey: ["reports","utilization","summary"],
    queryFn: () => reportsApi.getUtilization({ page:0, pageSize:100, sortBy:"utilizationRate", sortDir:"desc", filters:{} }),
  })
  const rows = (summary?.content ?? []) as Record<string,unknown>[]

  return (
    <PageShell title="Utilization Report" description="Billable vs total hours by fee earner">
      {rows.length > 0 && (
        <Box sx={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:2, mb:3 }}>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Billable vs Non-Billable Hours</Typography>
            <ApexChart type="bar" height={220}
              series={[
                { name:"Billable",     data: rows.map(r => Number(r.billableHours    ?? r.totalHours ?? 0)) },
                { name:"Non-Billable", data: rows.map(r => Number(r.nonBillableHours ?? 0)) },
              ]}
              options={{
                chart:{ toolbar:{ show:false }, stacked:true },
                xaxis:{ categories: rows.map(r => String(r.userName ?? r.name ?? "")), labels:{ style:{ fontSize:"11px" } } },
                colors:["#0F3C6E","#E2E8F0"],
                dataLabels:{ enabled:false },
                plotOptions:{ bar:{ borderRadius:4, columnWidth:"55%" } },
                grid:{ strokeDashArray:4 },
                yaxis:{ labels:{ formatter:(v:number) => `${v.toFixed(0)}h` } },
                legend:{ position:"top" },
              }}
            />
          </Paper>
          <Paper variant="outlined" sx={{ p:2.5, borderRadius:2, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:2 }}>
            {(() => {
              const avg = rows.length ? rows.reduce((s,r)=>s+Number(r.utilizationRate??0),0)/rows.length : 0
              const color = avg < 60 ? "error.main" : avg < 80 ? "warning.main" : "success.main"
              return (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight:700, textTransform:"uppercase", fontSize:10, letterSpacing:"0.08em" }}>Team Avg Utilization</Typography>
                  <Typography variant="h2" sx={{ fontWeight:800, color }}>{avg.toFixed(1)}%</Typography>
                  <Typography variant="caption" color="text.disabled">Target: 80%</Typography>
                </>
              )
            })()}
          </Paper>
        </Box>
      )}
      <DataGrid
        columns={[
          { field:"userName",       header:"Fee Earner",      sortKey:"userName" },
          { field:"totalHours",     header:"Total Hours",     align:"right", renderCell:(v)=>`${Number(v??0).toFixed(1)}h` },
          { field:"billableHours",  header:"Billable",        align:"right", renderCell:(v)=>`${Number(v??0).toFixed(1)}h` },
          { field:"utilizationRate",header:"Utilization",     align:"right",
            renderCell:(v) => {
              const n = Number(v??0)
              const color = n<60?"error.main":n<80?"warning.main":"success.main"
              return <Typography variant="body2" sx={{ fontWeight:700, color }}>{n.toFixed(1)}%</Typography>
            }
          },
          { field:"billedAmount",   header:"Billed Amount",   align:"right", renderCell:(v)=>`AED ${Number(v??0).toLocaleString()}` },
        ]}
        queryKey={["reports","utilization"]}
        queryFn={(p:GridParams) => reportsApi.getUtilization(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        defaultSortBy="utilizationRate" defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
