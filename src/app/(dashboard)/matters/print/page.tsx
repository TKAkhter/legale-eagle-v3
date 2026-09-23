import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Box, Typography, Button, Divider, CircularProgress } from "@mui/material"
import { env } from "@/config/env"
import { mattersApi } from "@/api/matters"
import { matterDetail as SD, matterTimelogs as STL, matterHearings as SH } from "@/data/static"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function MatterPrintPage() {
  const [params] = useSearchParams()
  const matterId = params.get("matterId") ?? ""

  const { data: matter, isLoading } = useQuery({
    queryKey: ["matters","print",matterId],
    queryFn: () => env.USE_STATIC_DATA ? Promise.resolve(SD) : mattersApi.getById(matterId),
    enabled: !!matterId,
  })

  useEffect(() => { if (matter) setTimeout(() => window.print(), 500) }, [matter])

  if (isLoading || !matter) return (
    <Box sx={{ display:"flex",justifyContent:"center",alignItems:"center",height:"100vh" }}>
      <CircularProgress />
    </Box>
  )

  const m    = matter as Record<string,unknown>
  const atty = m?.responsibleAttorney as {firstName?:string;lastName?:string}|null
  const cl   = m?.client as {companyName?:string;firstName?:string}|null
  const pa   = (m?.practiceArea as {name?:string})?.name ?? ""

  return (
    <>
      {/* Back / print controls — hidden when printing */}
      <Box sx={{
        position:"fixed", top:16, right:16, display:"flex", gap:1, zIndex:999,
        "@media print": { display:"none" }
      }}>
        <Button size="small" variant="outlined" onClick={() => window.history.back()}>
          ← Back
        </Button>
        <Button size="small" variant="contained" onClick={() => window.print()}>
          Print again
        </Button>
      </Box>
    <Box sx={{ maxWidth:800,mx:"auto",p:6,fontFamily:"'IBM Plex Sans',sans-serif","@media print":{p:4} }}>
      <Box sx={{ display:"flex",justifyContent:"space-between",mb:4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight:700,color:"#0F2744" }}>LegalEagle LMS</Typography>
          <Typography variant="body2" color="text.secondary">Confidential — Matter Summary</Typography>
        </Box>
        <Box sx={{ textAlign:"right" }}>
          <Typography variant="h5" sx={{ fontWeight:700,color:"#0F2744" }}>MATTER BRIEF</Typography>
          <Typography variant="body2">Matter: {String(m?.title ?? m?.matterSeq ?? "")}</Typography>
          <Typography variant="body2" color="text.secondary">Generated: {formatDate(new Date().toISOString())}</Typography>
        </Box>
      </Box>
      <Divider sx={{ mb:3,borderColor:"#0F2744",borderWidth:2 }} />
      <Box sx={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,mb:4 }}>
        {([
          ["Matter Number", String(m?.title ?? m?.matterSeq ?? "—")],
          ["Status",        String(m?.status ?? "—")],
          ["Client",        cl?.companyName || cl?.firstName || "—"],
          ["Attorney",      atty ? `${atty.firstName} ${atty.lastName}` : "—"],
          ["Practice Area", pa || "—"],
          ["Billing Type",  String(m?.billingType ?? "—")],
          ["Open Date",     formatDate(String(m?.openDate ?? m?.createdAt ?? ""))],
          ["Due Date",      m?.dueDate ? formatDate(String(m.dueDate)) : "—"],
        ] as [string,string][]).map(([label,value]) => (
          <Box key={label}>
            <Typography variant="caption" sx={{ fontWeight:700,color:"text.secondary",textTransform:"uppercase",letterSpacing:"0.08em",fontSize:10 }}>{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight:500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
      {!!m?.matterSubject && (
        <Box sx={{ mb:4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight:700,mb:1 }}>Subject</Typography>
          <Typography variant="body2">{String(m.matterSubject)}</Typography>
        </Box>
      )}
      <Box sx={{ mb:4 }}>
        <Typography variant="subtitle2" sx={{ fontWeight:700,mb:1.5 }}>Time Log Summary</Typography>
        <Box component="table" sx={{ width:"100%",borderCollapse:"collapse" }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor:"#0F2744" }}>
              {["Attorney","Activity","Date","Hours","Amount"].map(h=>(
                <Box component="th" key={h} sx={{ color:"white",p:1,textAlign:"left",fontSize:12 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {STL.map((t,i)=>(
              <Box component="tr" key={t.id} sx={{ bgcolor:i%2?"#F8FAFC":"white" }}>
                <Box component="td" sx={{ p:1,fontSize:12 }}>{t.responsiblePerson.firstName} {t.responsiblePerson.lastName}</Box>
                <Box component="td" sx={{ p:1,fontSize:12 }}>{t.activity}</Box>
                <Box component="td" sx={{ p:1,fontSize:12 }}>{formatDate(t.entryDate)}</Box>
                <Box component="td" sx={{ p:1,fontSize:12 }}>{t.totalHours.toFixed(1)} hrs</Box>
                <Box component="td" sx={{ p:1,fontSize:12 }}>{formatCurrency(t.billing)}</Box>
              </Box>
            ))}
            <Box component="tr" sx={{ borderTop:"2px solid #0F2744" }}>
              <Box component="td" colSpan={3} sx={{ p:1,fontWeight:700,fontSize:12 }}>Total</Box>
              <Box component="td" sx={{ p:1,fontWeight:700,fontSize:12 }}>{STL.reduce((s,t)=>s+t.totalHours,0).toFixed(1)} hrs</Box>
              <Box component="td" sx={{ p:1,fontWeight:700,fontSize:12 }}>{formatCurrency(STL.reduce((s,t)=>s+t.billing,0))}</Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ mb:4 }}>
        <Typography variant="subtitle2" sx={{ fontWeight:700,mb:1.5 }}>Upcoming Hearings</Typography>
        {SH.map(h=>(
          <Box key={h.id} sx={{ display:"flex",gap:3,py:1,borderBottom:"1px solid #E2E8F0" }}>
            <Typography variant="body2" sx={{ fontWeight:600,minWidth:120 }}>{formatDate(h.hearingDate)}</Typography>
            <Typography variant="body2" sx={{ minWidth:80 }}>{h.hearingTime}</Typography>
            <Typography variant="body2" sx={{ flex:1 }}>{h.hearingTitle}</Typography>
            <Typography variant="body2" color="text.secondary">{h.court}, {h.room}</Typography>
          </Box>
        ))}
      </Box>
      <Divider sx={{ mb:2 }} />
      <Typography variant="caption" color="text.disabled" sx={{ textAlign:"center",display:"block",fontSize:10 }}>
        Confidential — LegalEagle LMS — Printed {new Date().toLocaleString()}
      </Typography>
    </Box>
  )

    </>
  )
}