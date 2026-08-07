import { useState } from "react"
import { Box, Paper, Typography, Chip, Skeleton, Button, Divider } from "@mui/material"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import DownloadIcon from "@mui/icons-material/Download"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { ApexChart } from "@components/charts/ApexChart"
import { SearchInput } from "@components/filters/SearchInput"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
function WipFilters({onSearch,onReset,filters}:FilterPanelProps){const[q,setQ]=useState(String(filters.searchText??""));return(<Box sx={{display:"flex",gap:1.5,alignItems:"flex-end"}}><SearchInput value={q} onChange={setQ} placeholder="Filter by attorney or matter..."/><Button variant="contained" size="small" onClick={()=>onSearch({searchText:q})}>Apply</Button><Button size="small" onClick={()=>{setQ("");onReset()}}>Reset</Button></Box>)}
function KpiCard({label,value,sub,icon,loading}:{label:string;value?:string;sub?:string;icon:React.ReactNode;loading:boolean}){return(<Paper variant="outlined" sx={{p:2.5,borderRadius:2,display:"flex",alignItems:"flex-start",gap:2}}><Box sx={{p:1,borderRadius:1.5,bgcolor:"primary.main",color:"white",display:"flex"}}>{icon}</Box><Box><Typography variant="caption" color="text.secondary">{label}</Typography>{loading?<Skeleton width={100} height={32}/>:<Typography variant="h5" sx={{fontWeight:700,lineHeight:1.2}}>{value??"—"}</Typography>}{sub&&<Typography variant="caption" color="text.secondary">{sub}</Typography>}</Box></Paper>)}
export default function WipReportPage(){
  const{data:summary,isLoading:sl}=useQuery({queryKey:["reports","wip","summary"],queryFn:()=>reportsApi.wipSummary(),staleTime:5*60_000})
  const byUser=(summary as {byUser?:{name:string;amount:number}[]})?.byUser??[]
  const byStatus=(summary as {byStatus?:{name:string;count:number}[]})?.byStatus??[]
  return(
    <PageShell title="WIP Report" description="Work in Progress — billable time not yet invoiced" action={<Button variant="outlined" size="small" startIcon={<DownloadIcon/>} onClick={()=>alert("Export not available in static mode")}>Export Excel</Button>}>
      <Box sx={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:2,mb:3}}>
        <KpiCard label="Total WIP Value" loading={sl} icon={<TrendingUpIcon sx={{fontSize:20}}/>} value={formatCurrency((summary as {totalWip?:number})?.totalWip??0)} sub="Unbilled billable work"/>
        <KpiCard label="Total WIP Hours" loading={sl} icon={<AccessTimeIcon sx={{fontSize:20}}/>} value={`${((summary as {totalHours?:number})?.totalHours??0).toFixed(1)} hrs`} sub="Across all fee earners"/>
      </Box>
      {!sl&&byUser.length>0&&<Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:2,mb:3}}>
        <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}><Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>WIP by Fee Earner</Typography><ApexChart type="bar" height={200} series={[{name:"Amount (AED)",data:byUser.map(u=>u.amount)}]} options={{chart:{toolbar:{show:false}},xaxis:{categories:byUser.map(u=>u.name.split(" ")[0])},colors:["#0F3C6E"],dataLabels:{enabled:false},plotOptions:{bar:{borderRadius:4,columnWidth:"55%"}},grid:{strokeDashArray:4},yaxis:{labels:{formatter:(v:number)=>`${(v/1000).toFixed(0)}K`}}}}/></Paper>
        <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}><Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>WIP by Status</Typography><ApexChart type="donut" height={200} series={byStatus.map(s=>s.count)} options={{labels:byStatus.map(s=>s.name),colors:["#0F3C6E","#00B4A6","#22C55E","#F59E0B"],legend:{position:"bottom"},dataLabels:{enabled:true},plotOptions:{pie:{donut:{size:"65%"}}}}}/></Paper>
      </Box>}
      <Divider sx={{mb:2.5}}/>
      <DataGrid columns={[{field:"userName",header:"Fee Earner",sortKey:"userName"},{field:"matterTitle",header:"Matter",sortKey:"matterTitle"},{field:"activity",header:"Activity"},{field:"entryDate",header:"Date",sortKey:"entryDate",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"},{field:"totalHours",header:"Hours",sortKey:"totalHours",align:"right",renderCell:(v)=>`${Number(v??0).toFixed(1)} hrs`},{field:"totalAmount",header:"Amount",sortKey:"totalAmount",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"revenueStatus",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>},{field:"billingType",header:"Type",renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined" sx={{fontSize:11}}/>}]}
        queryKey={["reports","wip"]} queryFn={(p:GridParams)=>reportsApi.getWip(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} FilterPanel={WipFilters} hasFilters syncWithUrl defaultSortBy="entryDate" defaultSortDir="desc"/>
    </PageShell>
  )
}
