import { useQuery } from "@tanstack/react-query"
import { Box, Paper, Typography, Chip, LinearProgress } from "@mui/material"
import { PageShell }      from "@/components/ui/PageShell"
import { StatusBadge }    from "@/components/ui/StatusBadge"
import { env }            from "@/config/env"
import { axiosClient }    from "@lib/api/axios"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { invoices as staticInvoices } from "@/data/static"

const BUCKETS = [
  { label:"Current",  min:0,   max:30,       color:"#059669" },
  { label:"31–60d",  min:31,  max:60,       color:"#D97706" },
  { label:"61–90d",  min:61,  max:90,       color:"#EA580C" },
  { label:"91–120d", min:91,  max:120,      color:"#DC2626" },
  { label:"120d+",   min:121, max:Infinity, color:"#7F1D1D" },
]

function daysPastDue(due: string) {
  const d = new Date(due); if (isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now()-d.getTime())/86400000))
}

export default function AgingReportPage() {
  const { data: invoices=[], isLoading } = useQuery<Record<string,unknown>[]>({
    queryKey: ["reports","aging"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA)
        return (staticInvoices as Record<string,unknown>[]).filter(i=>i.invoiceStatus!=="Paid"&&i.invoiceStatus!=="Void")
      const r = await axiosClient.get("/api/invoice/filter/all/v2",{params:{pageNumber:0,pageSize:200,invoiceStatus:"All",clientId:"",matterId:"",fromDate:"",toDate:""}})
      const d = r.data?.data??r.data
      return (d.content??[]).filter((i:Record<string,unknown>)=>i.invoiceStatus!=="Paid"&&i.invoiceStatus!=="Void")
    },
  })

  const bucketData = BUCKETS.map(b=>{
    const items = invoices.filter(inv=>{ const d=daysPastDue(String(inv.dueDate??"")); return d>=b.min&&d<=b.max })
    const total = items.reduce((s,inv)=>s+Number(inv.balanceAmount??inv.taxableAmount??0),0)
    return {...b,items,total}
  })
  const grandTotal = bucketData.reduce((s,b)=>s+b.total,0)

  return (
    <PageShell title="Billing Aging Report" description="Outstanding invoices grouped by days past due">
      <Box sx={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:2,mb:3}}>
        {bucketData.map(b=>(
          <Paper key={b.label} variant="outlined" sx={{p:2,borderRadius:2,borderTop:`3px solid ${b.color}`}}>
            <Typography variant="caption" sx={{fontWeight:600,color:"text.secondary"}}>{b.label}</Typography>
            <Typography variant="h6" sx={{fontWeight:700,color:b.color}}>{formatCurrency(b.total)}</Typography>
            <Typography variant="caption" color="text.disabled">{b.items.length} invoice{b.items.length!==1?"s":""}</Typography>
            {grandTotal>0&&<LinearProgress variant="determinate" value={(b.total/grandTotal)*100} sx={{mt:1,height:3,borderRadius:2,bgcolor:"action.hover","& .MuiLinearProgress-bar":{bgcolor:b.color}}}/>}
          </Paper>
        ))}
      </Box>
      {isLoading ? <LinearProgress /> : bucketData.filter(b=>b.items.length>0).map(b=>(
        <Box key={b.label} sx={{mb:3}}>
          <Box sx={{display:"flex",alignItems:"center",gap:1,mb:1.5}}>
            <Box sx={{width:12,height:12,borderRadius:"50%",bgcolor:b.color}}/>
            <Typography variant="subtitle2" sx={{fontWeight:700}}>{b.label}</Typography>
            <Chip size="small" label={formatCurrency(b.total)} sx={{bgcolor:b.color+"20",color:b.color,fontWeight:600}}/>
          </Box>
          <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}>
            <Box component="table" sx={{width:"100%",borderCollapse:"collapse"}}>
              <Box component="thead"><Box component="tr" sx={{bgcolor:"action.hover"}}>
                {["Invoice #","Client","Matter","Due Date","Days Past Due","Balance","Status"].map(h=>(
                  <Box component="th" key={h} sx={{px:2,py:1,textAlign:"left",fontSize:12,fontWeight:600,color:"text.secondary"}}>{h}</Box>
                ))}
              </Box></Box>
              <Box component="tbody">
                {b.items.map((inv,i)=>{
                  const days=daysPastDue(String(inv.dueDate??""))
                  const cl=inv.client as {companyName?:string;firstName?:string;lastName?:string}|null
                  const mt=inv.matter as {title?:string}|null
                  return (
                    <Box component="tr" key={String(inv.id)} sx={{bgcolor:i%2?"action.hover":"transparent"}}>
                      <Box component="td" sx={{px:2,py:1,fontSize:13,fontWeight:600}}>{String(inv.invoiceNo??"—")}</Box>
                      <Box component="td" sx={{px:2,py:1,fontSize:13}}>{cl?.companyName||`${cl?.firstName??""} ${cl?.lastName??""}`.trim()||"—"}</Box>
                      <Box component="td" sx={{px:2,py:1,fontSize:13}}>{mt?.title??"—"}</Box>
                      <Box component="td" sx={{px:2,py:1,fontSize:13}}>{inv.dueDate?new Date(String(inv.dueDate)).toLocaleDateString("en-GB"):"—"}</Box>
                      <Box component="td" sx={{px:2,py:1}}><Typography variant="caption" sx={{fontWeight:700,color:b.color}}>{days}d</Typography></Box>
                      <Box component="td" sx={{px:2,py:1,fontSize:13,fontWeight:700,color:"error.main"}}>{formatCurrency(Number(inv.balanceAmount??inv.taxableAmount??0))}</Box>
                      <Box component="td" sx={{px:2,py:1}}><StatusBadge status={String(inv.invoiceStatus??"")} /></Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </Paper>
        </Box>
      ))}
    </PageShell>
  )
}
