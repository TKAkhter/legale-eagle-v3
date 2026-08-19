import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, Paper, Chip, Button, Divider } from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"; import AddIcon from "@mui/icons-material/Add"; import CloseIcon from "@mui/icons-material/Close"; import GavelIcon from "@mui/icons-material/Gavel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"; import { mattersApi } from "@/api/matters"
import { PageShell } from "@/components/ui/PageShell"; import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"; import { Tabs } from "@/components/ui/Tabs"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { HearingFormDrawer } from "../_components/HearingFormDrawer"
import { MatterCloseDialog } from "../_components/MatterCloseDialog"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"
import { useStopwatchStore } from "@lib/store/stopwatchStore"
import { formatDate } from "@lib/utils/formatDate"; import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"; import { logger } from "@/lib/logger"
import { matterDetail as SD, matterTimelogs as STL, matterHearings as SH, matterTasks as ST, matterInvoices as SI } from "@/data/static"
import type { GridParams } from "@/types/common.types"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return <Box sx={{ mb:1.5 }}><Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</Typography><Typography variant="body2" sx={{ fontWeight:500,mt:0.25 }}>{value ?? "—"}</Typography></Box>
}

export default function MatterDetailPage() {
  const { matterId } = useParams(); const qc = useQueryClient()
  const startStopwatch = useStopwatchStore(s => s.start)
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [hearingOpen, setHearingOpen] = useState(false)
  const [closeOpen,   setCloseOpen]   = useState(false)

  const { data: matter, isLoading } = useQuery({
    queryKey: ["matters","detail",matterId],
    queryFn: () => { logger.debug("MatterDetail",`id:${matterId}`); return env.USE_STATIC_DATA ? Promise.resolve(SD) : mattersApi.getById(matterId!) },
    enabled: !!matterId,
  })

  async function mkList<T>(staticData: T[], url: string, params?: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) return { content:staticData as Record<string,unknown>[], totalElements:staticData.length, totalPages:1, number:0, size:staticData.length, first:true, last:true, empty:staticData.length===0 }
    const { axiosClient } = await import("@lib/api/axios")
    const res = await axiosClient.get(url, { params })
    const list = res.data?.data ?? res.data ?? []
    return { content:Array.isArray(list)?list:[list].filter(Boolean), totalElements:list.length??0, totalPages:1, number:0, size:list.length??0, first:true, last:true, empty:!list?.length }
  }

  if (isLoading) return <PageShell title="Matter"><DetailSkeleton /></PageShell>
  const m = matter as Record<string,unknown>
  const atty = m?.responsibleAttorney as { firstName?:string; lastName?:string } | null
  const cl = m?.client as { companyName?:string; firstName?:string } | null
  const pa = (m?.practiceArea as { name?:string })?.name ?? ""

  return (
    <PageShell title={`Matter ${String(m?.title??m?.matterSeq??"")}`} description={String(m?.matterSubject??m?.description??"")}
      breadcrumbs={[{label:"Matters",path:"/matters"},{label:String(m?.title??"Detail")}]}
      action={<Box sx={{display:"flex",gap:1,flexWrap:"wrap"}}>
        <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />} onClick={()=>{ startStopwatch(String(m?.matterId??matterId??""),String(m?.title??"")); toast.info("Stopwatch started") }}>Log Time</Button>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={()=>setHearingOpen(true)}>Hearing</Button>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={()=>setLogTimeOpen(true)}>Time Entry</Button>
        <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={()=>setCloseOpen(true)}>Close</Button>
      </Box>}>
      <Paper variant="outlined" sx={{p:3,mb:3,borderRadius:2}}>
        <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:2}}>
          <Box sx={{display:"flex",alignItems:"center",gap:2}}>
            <Box sx={{p:1.5,borderRadius:1.5,bgcolor:"primary.main",color:"white",display:"flex"}}><GavelIcon sx={{fontSize:22}} /></Box>
            <Box>
              <Typography variant="h6" sx={{fontWeight:700}}>Matter {String(m?.title??"")}</Typography>
              <Typography variant="body2" color="text.secondary">{String(m?.matterSubject??"")}</Typography>
            </Box>
          </Box>
          <Box sx={{display:"flex",gap:1,flexWrap:"wrap"}}>
            <StatusBadge status={String(m?.status??"")} />
            <Chip size="small" label={String(m?.billingType??"")} variant="outlined" />
            {!!pa&&<Chip size="small" label={pa} variant="outlined" />}
          </Box>
        </Box>
        <Divider sx={{my:2}} />
        <Box sx={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:2}}>
          <InfoRow label="Client"    value={cl?.companyName||cl?.firstName||"—"} />
          <InfoRow label="Attorney"  value={atty?`${atty.firstName} ${atty.lastName}`:"—"} />
          <InfoRow label="Open Date" value={formatDate(String(m?.openDate??m?.createdAt??""))} />
          <InfoRow label="Due Date"  value={m?.dueDate?formatDate(String(m.dueDate)):"—"} />
        </Box>
      </Paper>
      <Box sx={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,mb:3}}>
        {([ {l:"Time Logs",v:String(m?.totalTimelogs??STL.length)},{l:"Invoices",v:String(m?.totalInvoices??SI.length)},{l:"Pending Tasks",v:String(m?.pendingTasks??(ST as {taskStatus:string}[]).filter(t=>t.taskStatus!=="Completed").length)} ]).map(({l,v})=>(
          <Paper key={l} variant="outlined" sx={{p:2,borderRadius:2,textAlign:"center"}}><Typography variant="caption" color="text.secondary">{l}</Typography><Typography variant="h5" sx={{fontWeight:700}}>{v}</Typography></Paper>
        ))}
      </Box>
      <Tabs tabs={[
        { label:"Time Logs", content:(
          <DataGrid columns={[{field:"responsiblePerson",header:"Attorney",renderCell:(v)=>{ const u=v as {firstName:string;lastName:string}; return u?`${u.firstName} ${u.lastName}`:"—" }},{field:"activity",header:"Activity"},{field:"entryDate",header:"Date",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"},{field:"totalHours",header:"Hours",align:"right",renderCell:(v)=>`${Number(v??0).toFixed(1)} hrs`},{field:"billing",header:"Amount",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"revenueStatus",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>}]}
            queryKey={["matters","timelogs",matterId]} queryFn={(p)=>mkList(STL,"/api/activity/get/by/Matter",{matterId}) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} />
        )},
        { label:"Hearings", content:(
          <DataGrid columns={[{field:"hearingTitle",header:"Hearing"},{field:"hearingDate",header:"Date",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"},{field:"hearingTime",header:"Time"},{field:"court",header:"Court"},{field:"room",header:"Room"},{field:"status",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>}]}
            queryKey={["matters","hearings",matterId]} queryFn={(p)=>mkList(SH,"/api/hearing/get",{matterId}) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} />
        )},
        { label:"Tasks", content:(
          <DataGrid columns={[{field:"taskName",header:"Task"},{field:"priority",header:"Priority",renderCell:(v)=><Chip size="small" label={String(v??"")} color={String(v)==="High"?"error":"warning"} variant="outlined"/>},{field:"taskStatus",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>},{field:"assignedTo",header:"Assigned To",renderCell:(v)=>{ const u=v as {firstName:string;lastName:string}; return u?`${u.firstName} ${u.lastName}`:"—" }},{field:"taskDeadLine",header:"Due",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"}]}
            queryKey={["matters","tasks",matterId]} queryFn={(p)=>mkList(ST,"/api/task/get/full/task",{eventType:"MATTER",eventTypeId:matterId}) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} />
        )},
        { label:"Invoices", content:(
          <DataGrid columns={[{field:"invoiceNo",header:"Invoice #"},{field:"taxableAmount",header:"Total",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"paidAmount",header:"Paid",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"balanceAmount",header:"Balance",align:"right",renderCell:(v)=><Typography variant="body2" sx={{color:Number(v)>0?"error.main":"success.main",fontWeight:500}}>{formatCurrency(Number(v??0))}</Typography>},{field:"invoiceStatus",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>}]}
            queryKey={["matters","invoices",matterId]} queryFn={(p)=>mkList(SI,"/api/invoice/filter/by/matter",{matterId}) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} />
        )},
      ]} />
      <ActivityFormDrawer open={logTimeOpen} onClose={()=>setLogTimeOpen(false)} prefillMatterId={matterId!} onSuccess={()=>{ setLogTimeOpen(false); qc.invalidateQueries({queryKey:["matters","timelogs",matterId]}); toast.success("Time entry saved") }} />
      <HearingFormDrawer open={hearingOpen} onClose={()=>{ setHearingOpen(false); qc.invalidateQueries({queryKey:["matters","hearings",matterId]}); toast.success("Hearing scheduled") }} matterId={matterId!} />
      <MatterCloseDialog open={closeOpen} onClose={()=>{ setCloseOpen(false); qc.invalidateQueries({queryKey:["matters","detail",matterId]}); toast.success("Matter closed") }} matterId={matterId!} matterTitle={String(m?.title??"")} />
    </PageShell>
  )
}
