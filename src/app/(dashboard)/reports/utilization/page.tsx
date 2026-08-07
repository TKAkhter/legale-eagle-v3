import { Box, Typography, LinearProgress, Tooltip } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"
function UtilBar({rate}:{rate:number}){const pct=Math.min(Math.round(rate),100);const color=pct>=80?"success.main":pct>=60?"warning.main":"error.main";return(<Tooltip title={`${pct}% utilization`}><Box sx={{minWidth:120,display:"flex",alignItems:"center",gap:1}}><Box sx={{flex:1}}><LinearProgress variant="determinate" value={pct} sx={{height:6,borderRadius:3,bgcolor:"action.hover","& .MuiLinearProgress-bar":{bgcolor:color,borderRadius:3}}}/></Box><Typography variant="caption" sx={{fontWeight:600,color,minWidth:32}}>{pct}%</Typography></Box></Tooltip>)}
export default function UtilizationPage(){
  return(
    <PageShell title="Utilization Report" description="Fee earner productivity and billing efficiency">
      <DataGrid columns={[{field:"userName",header:"Fee Earner",sortKey:"userName"},{field:"totalHours",header:"Total Hours",sortKey:"totalHours",align:"right",renderCell:(v)=>`${Number(v??0).toFixed(1)} hrs`},{field:"billableHours",header:"Billable",sortKey:"billableHours",align:"right",renderCell:(v)=><Typography variant="body2" sx={{color:"primary.main",fontWeight:500}}>{Number(v??0).toFixed(1)} hrs</Typography>},{field:"utilizationRate",header:"Utilization",renderCell:(v)=><UtilBar rate={Number(v??0)}/>},{field:"billedAmount",header:"Billed",sortKey:"billedAmount",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))}]}
        queryKey={["reports","utilization"]} queryFn={(p:GridParams)=>reportsApi.getUtilization(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} hasFilters={false} syncWithUrl defaultSortBy="utilizationRate" defaultSortDir="desc"/>
    </PageShell>
  )
}
