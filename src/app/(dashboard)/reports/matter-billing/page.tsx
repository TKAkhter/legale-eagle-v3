import { Box, Typography, Chip, Button, LinearProgress, Tooltip } from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"
function CollectionBar({billed,collected}:{billed:number;collected:number}){const pct=billed>0?Math.round((collected/billed)*100):0;return(<Tooltip title={`${pct}% collected`}><Box sx={{minWidth:100}}><Typography variant="caption" color="text.secondary">{pct}%</Typography><LinearProgress variant="determinate" value={pct} sx={{height:6,borderRadius:3,bgcolor:"action.hover","& .MuiLinearProgress-bar":{bgcolor:pct>=80?"success.main":pct>=50?"warning.main":"error.main",borderRadius:3}}}/></Box></Tooltip>)}
export default function MatterBillingPage(){
  return(
    <PageShell title="Matter Billing Report" description="Billed vs collected amounts per matter" action={<Button variant="outlined" size="small" startIcon={<DownloadIcon/>} onClick={()=>alert("Export not available in static mode")}>Export Excel</Button>}>
      <DataGrid columns={[{field:"matterTitle",header:"Matter",sortKey:"matterTitle"},{field:"clientName",header:"Client",sortKey:"clientName"},{field:"billingType",header:"Billing",renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined" sx={{fontSize:11}}/>},{field:"totalBilled",header:"Total Billed",sortKey:"totalBilled",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"collected",header:"Collected",align:"right",renderCell:(v)=><Typography variant="body2" sx={{color:"success.main",fontWeight:500}}>{formatCurrency(Number(v??0))}</Typography>},{field:"wip",header:"WIP",align:"right",renderCell:(v)=><Typography variant="body2" sx={{color:Number(v)>0?"warning.main":"text.secondary"}}>{formatCurrency(Number(v??0))}</Typography>},{field:"collected",header:"Collection Rate",renderCell:(_,row)=>{const r=row as Record<string,number>;return<CollectionBar billed={r.totalBilled??0} collected={r.collected??0}/>}},{field:"status",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>}]}
        queryKey={["reports","matter-billing"]} queryFn={(p:GridParams)=>reportsApi.getMatterBilling(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} hasFilters={false} syncWithUrl defaultSortBy="totalBilled" defaultSortDir="desc"/>
    </PageShell>
  )
}
