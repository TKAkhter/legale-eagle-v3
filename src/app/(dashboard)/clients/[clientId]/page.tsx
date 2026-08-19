import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, Paper, Avatar, Chip, Button } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"; import { clientsApi } from "@/api/clients"
import { PageShell } from "@/components/ui/PageShell"; import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"; import { Tabs } from "@/components/ui/Tabs"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ClientFormDrawer } from "../_components/ClientFormDrawer"
import { formatDate } from "@lib/utils/formatDate"; import { formatCurrency } from "@lib/utils/formatCurrency"
import { clientDetail as SD, clientMatters as SM, clientInvoices as SI } from "@/data/static"
import { toast } from "@/lib/toast"; import { logger } from "@/lib/logger"
import type { GridParams } from "@/types/common.types"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return <Box sx={{ mb:1.5 }}><Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</Typography><Typography variant="body2" sx={{ fontWeight:500,mt:0.25 }}>{value ?? "—"}</Typography></Box>
}

export default function ClientDetailPage() {
  const { clientId } = useParams(); const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const { data: client, isLoading } = useQuery({
    queryKey: ["clients","detail",clientId],
    queryFn: () => { logger.debug("ClientDetail",`id:${clientId}`); return env.USE_STATIC_DATA ? Promise.resolve(SD) : clientsApi.getById(clientId!) },
    enabled: !!clientId,
  })

  async function fetchMatters(_p: GridParams) {
    if (env.USE_STATIC_DATA) return { content:SM as Record<string,unknown>[], totalElements:SM.length, totalPages:1, number:0, size:SM.length, first:true, last:true, empty:SM.length===0 }
    const { axiosClient } = await import("@lib/api/axios")
    const res = await axiosClient.get("/api/matter/list/by/client", { params:{ clientId } })
    const list = res.data?.data ?? res.data ?? []
    return { content:list, totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 }
  }

  async function fetchInvoices(_p: GridParams) {
    if (env.USE_STATIC_DATA) return { content:SI as Record<string,unknown>[], totalElements:SI.length, totalPages:1, number:0, size:SI.length, first:true, last:true, empty:SI.length===0 }
    const { axiosClient } = await import("@lib/api/axios")
    const res = await axiosClient.get("/api/invoice/filter/by/client", { params:{ clientId } })
    const d = res.data?.data ?? res.data; return { content:d.content??[], totalElements:d.totalElements??0, totalPages:d.totalPages??0, number:d.number??0, size:d.size??25, first:d.first??true, last:d.last??true, empty:d.empty??true }
  }

  if (isLoading) return <PageShell title="Client"><DetailSkeleton /></PageShell>
  const c = client as Record<string,unknown>
  const name = String(c?.companyName || `${c?.firstName??""} ${c?.lastName??""}`.trim() || "Client")

  return (
    <PageShell title={name} description={`Client • ${String(c?.clientType??"")}`}
      breadcrumbs={[{label:"Clients",path:"/clients"},{label:name}]}
      action={<Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={()=>setEditOpen(true)}>Edit</Button>}>
      <Paper variant="outlined" sx={{p:3,mb:3,borderRadius:2,display:"flex",gap:2.5,alignItems:"center",flexWrap:"wrap"}}>
        <Avatar sx={{width:56,height:56,bgcolor:"primary.main",fontSize:22}}>{name?.[0]?.toUpperCase()??"C"}</Avatar>
        <Box sx={{flex:1}}>
          <Typography variant="h6" sx={{fontWeight:700}}>{name}</Typography>
          <Box sx={{display:"flex",gap:1,mt:0.75,flexWrap:"wrap"}}>
            <StatusBadge status={c?.active?"active":"inactive"} />
            <Chip size="small" label={String(c?.clientType??"")} variant="outlined" />
            {!!c?.trnNo&&<Chip size="small" label={`TRN: ${String(c.trnNo)}`} variant="outlined" />}
          </Box>
        </Box>
        <Box sx={{display:"flex",gap:3}}>
          {([["Open Matters", String(c?.openMatter??0)],["Closed", String(c?.closedMatter??0)],["Total Billed", formatCurrency(Number(c?.totalInvoiceAmount??0))]] as [string,string][]).map(([l,v])=>(
            <Box key={String(l)} sx={{textAlign:"center"}}><Typography variant="caption" color="text.secondary">{l}</Typography><Typography variant="h6" sx={{fontWeight:700}}>{v}</Typography></Box>
          ))}
        </Box>
      </Paper>
      <Tabs tabs={[
        { label:"Overview", content:(
          <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:3}}>
            <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}>
              <Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>Contact</Typography>
              <InfoRow label="Email" value={String(c?.email??"—")} />
              <InfoRow label="Phone" value={String(c?.phone??"—")} />
              <InfoRow label="Address" value={String(c?.address??"—")} />
            </Paper>
            <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}>
              <Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>Details</Typography>
              <InfoRow label="Type" value={String(c?.clientType??"—")} />
              <InfoRow label="TRN / VAT" value={String(c?.trnNo??"—")} />
              <InfoRow label="Nationality" value={String(c?.nationality??"—")} />
              <InfoRow label="Created" value={formatDate(String(c?.createdAt??""))} />
            </Paper>
          </Box>
        )},
        { label:"Matters", content:(
          <DataGrid columns={[{field:"title",header:"Title",sortKey:"title"},{field:"practiceArea",header:"Practice Area"},{field:"billingType",header:"Billing",renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined"/>},{field:"status",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>},{field:"createdAt",header:"Opened",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"}]}
            queryKey={["clients","matters",clientId]} queryFn={(p)=>fetchMatters(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
            detailPath={(row)=>`/matters/${(row as Record<string,string>).id}`} />
        )},
        { label:"Invoices", content:(
          <DataGrid columns={[{field:"invoiceNo",header:"Invoice #"},{field:"taxableAmount",header:"Total",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"paidAmount",header:"Paid",align:"right",renderCell:(v)=>formatCurrency(Number(v??0))},{field:"balanceAmount",header:"Balance",align:"right",renderCell:(v)=><Typography variant="body2" sx={{color:Number(v)>0?"error.main":"success.main",fontWeight:500}}>{formatCurrency(Number(v??0))}</Typography>},{field:"invoiceStatus",header:"Status",renderCell:(v)=><StatusBadge status={String(v??"")}/>},{field:"dueDate",header:"Due",renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—"}]}
            queryKey={["clients","invoices",clientId]} queryFn={(p)=>fetchInvoices(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>} />
        )},
      ]} />
      <ClientFormDrawer open={editOpen} onClose={()=>setEditOpen(false)} clientId={clientId} onSaved={()=>{ setEditOpen(false); qc.invalidateQueries({queryKey:["clients","detail",clientId]}); toast.success("Client updated") }} />
    </PageShell>
  )
}
