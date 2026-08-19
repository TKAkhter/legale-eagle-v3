import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Box, Typography, Paper, Chip, Button, Avatar, Divider } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"; import SwapHorizIcon from "@mui/icons-material/SwapHoriz"; import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { env } from "@/config/env"; import { leadsApi } from "@/api/leads"
import { PageShell } from "@/components/ui/PageShell"; import { StatusBadge } from "@/components/ui/StatusBadge"
import { Tabs } from "@/components/ui/Tabs"; import { DetailSkeleton } from "@/components/ui/Skeletons"
import { FollowupFormDrawer } from "../_components/FollowupFormDrawer"
import { LeadConvertDialog } from "../_components/LeadConvertDialog"
import { LeadFormDrawer } from "../_components/LeadFormDrawer"
import { fromNow, formatDate } from "@lib/utils/formatDate"
import { leadDetail as SD, leadFollowups as SF } from "@/data/static"
import { toast } from "@/lib/toast"; import { logger } from "@/lib/logger"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return <Box sx={{ mb:1.5 }}><Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</Typography><Typography variant="body2" sx={{ fontWeight:500,mt:0.25 }}>{value ?? "—"}</Typography></Box>
}

export default function LeadDetailPage() {
  const { leadId } = useParams(); const navigate = useNavigate(); const qc = useQueryClient()
  const [followupOpen, setFollowupOpen] = useState(false)
  const [convertOpen,  setConvertOpen]  = useState(false)
  const [editOpen,     setEditOpen]     = useState(false)

  const { data: lead, isLoading } = useQuery({
    queryKey: ["leads","detail",leadId],
    queryFn: () => env.USE_STATIC_DATA ? Promise.resolve(SD) : leadsApi.getById(leadId!),
    enabled: !!leadId,
  })

  const { data: followups = [] } = useQuery<unknown[]>({
    queryKey: ["leads","followups",leadId],
    queryFn: async (): Promise<unknown[]> => { if (env.USE_STATIC_DATA) return SF; try { return await leadsApi.getFollowups?.(leadId!) ?? [] } catch { return [] } },
    enabled: !!leadId,
  })

  if (isLoading) return <PageShell title="Lead"><DetailSkeleton /></PageShell>
  const l = lead as Record<string,unknown>
  const name = l?.companyName ? String(l.companyName) : `${l?.firstName??""} ${l?.lastName??""}`.trim()
  const atty = l?.lawyer as { firstName?:string; lastName?:string } | null
  const pa = (l?.practiceArea as {name?:string})?.name ?? ""

  return (
    <PageShell title={name||"Lead"} description={`Lead • ${pa}`}
      breadcrumbs={[{label:"Leads",path:"/leads"},{label:name}]}
      action={<Box sx={{display:"flex",gap:1}}>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={()=>setEditOpen(true)}>Edit</Button>
        <Button size="small" variant="outlined" startIcon={<AddIcon />}  onClick={()=>setFollowupOpen(true)}>Follow-up</Button>
        <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={()=>setConvertOpen(true)}>Convert</Button>
      </Box>}>
      <Paper variant="outlined" sx={{p:3,mb:3,borderRadius:2,display:"flex",gap:2.5,alignItems:"center",flexWrap:"wrap"}}>
        <Avatar sx={{width:56,height:56,bgcolor:"secondary.main",fontSize:22}}>{name?.[0]?.toUpperCase()??"L"}</Avatar>
        <Box sx={{flex:1}}>
          <Typography variant="h6" sx={{fontWeight:700}}>{name}</Typography>
          <Box sx={{display:"flex",gap:1,mt:0.75,flexWrap:"wrap"}}>
            <StatusBadge status={String(l?.currentStatus??"")} />
            <Chip size="small" label={String(l?.leadType??"")} variant="outlined" />
            {pa&&<Chip size="small" label={pa} variant="outlined" />}
          </Box>
        </Box>
        <Typography variant="caption" color="text.disabled">Created {formatDate(String(l?.createdAt??""))}</Typography>
      </Paper>
      <Tabs tabs={[
        { label:"Overview", content:(
          <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:3}}>
            <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}>
              <Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>Contact</Typography>
              <InfoRow label="Email" value={(l?.emails as {emailId:string}[])?.[0]?.emailId??String(l?.email??"—")} />
              <InfoRow label="Phone" value={(l?.phones as {phoneNo:string}[])?.[0]?.phoneNo??String(l?.phone??"—")} />
              <InfoRow label="Company" value={String(l?.companyName??"—")} />
            </Paper>
            <Paper variant="outlined" sx={{p:2.5,borderRadius:2}}>
              <Typography variant="subtitle2" sx={{fontWeight:600,mb:2}}>Assignment</Typography>
              <InfoRow label="Attorney" value={atty?`${atty.firstName} ${atty.lastName}`:"—"} />
              <InfoRow label="Practice Area" value={pa||"—"} />
              <InfoRow label="Lead Source" value={(l?.leadSource as {name?:string})?.name||"—"} />
            </Paper>
            {!!l?.description&&<Paper variant="outlined" sx={{p:2.5,borderRadius:2,gridColumn:{md:"span 2"}}}><Typography variant="subtitle2" sx={{fontWeight:600,mb:1}}>Notes</Typography><Typography variant="body2" color="text.secondary">{String(l.description ?? "")}</Typography></Paper>}
          </Box>
        )},
        { label:`Follow-ups (${(followups as unknown[]).length})`, content:(
          <Box sx={{pl:1,pt:1}}>
            {!(followups as unknown[]).length && <Typography variant="body2" color="text.secondary" sx={{py:3,textAlign:"center"}}>No follow-ups yet</Typography>}
            {(followups as Record<string,unknown>[]).map((f,i)=>(
              <Box key={String(f.id??i)} sx={{display:"flex",gap:2,mb:2}}>
                <Box sx={{width:10,height:10,borderRadius:"50%",bgcolor:"secondary.main",mt:0.5,flexShrink:0}} />
                <Box sx={{flex:1,pb:2}}>
                  <Typography variant="body2" sx={{fontWeight:500}}>{String(f.followUpContent??f.content??"—")}</Typography>
                  <Typography variant="caption" color="text.secondary">{fromNow(String(f.createdAt??f.followUpTime??""))} {f.createdBy ?`· ${f.createdBy}`:""}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )},
      ]} />
      <FollowupFormDrawer open={followupOpen} onClose={()=>setFollowupOpen(false)} leadId={leadId!} onSuccess={()=>{ setFollowupOpen(false); qc.invalidateQueries({queryKey:["leads","followups",leadId]}); toast.success("Follow-up added") }} />
      <LeadConvertDialog open={convertOpen} onClose={()=>setConvertOpen(false)} leadId={leadId!} leadName={name} />
      <LeadFormDrawer open={editOpen} onClose={()=>setEditOpen(false)} leadId={leadId} onSaved={()=>{ setEditOpen(false); qc.invalidateQueries({queryKey:["leads","detail",leadId]}); toast.success("Lead updated") }} />
    </PageShell>
  )
}
