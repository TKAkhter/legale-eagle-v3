import { useParams } from "react-router-dom"
import { Box, Paper, Chip, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { lfaItems as staticLfa } from "@/data/static"
import { logger } from "@/lib/logger"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb:1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display:"block",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight:500,mt:0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

export default function LfaDetailPage() {
  const { lfaId } = useParams()

  const { data: lfa, isLoading } = useQuery({
    queryKey: ["lfa","detail",lfaId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        logger.debug("LfaDetail", `Static LFA: ${lfaId}`)
        return (staticLfa as Record<string,unknown>[]).find(l => l.id === lfaId) ?? staticLfa[0]
      }
      const r = await axiosClient.get("/api/lfa/get/full", { params: { lfaId } })
      return r.data?.data ?? r.data
    },
    enabled: !!lfaId,
  })

  if (isLoading) return <PageShell title="LFA"><DetailSkeleton /></PageShell>

  const l = lfa as Record<string,unknown>
  const client = l?.client as { companyName?:string; firstName?:string } | null
  const matter = l?.matter as { title?:string } | null

  return (
    <PageShell
      title={String(l?.lfaTitle ?? l?.agreementNo ?? "LFA")}
      description={`Fee Agreement • ${String(l?.agreementNo ?? "")}`}
      breadcrumbs={[{label:"LFA",path:"/lfa"},{label:String(l?.lfaTitle ?? "Detail")}]}
    >
      <Paper variant="outlined" sx={{ p:3, mb:3, borderRadius:2 }}>
        <Box sx={{ display:"flex", gap:1, mb:2.5, flexWrap:"wrap" }}>
          <StatusBadge status={String(l?.lfaStatus ?? "")} />
          <Chip size="small" label={String(l?.billingType ?? "")} variant="outlined" />
          {!!l?.current && <Chip size="small" label="Current" color="success" />}
        </Box>
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"1fr 1fr 1fr" }, gap:2 }}>
          <InfoRow label="Agreement No."  value={String(l?.agreementNo ?? "—")} />
          <InfoRow label="Client"         value={client?.companyName || client?.firstName || "—"} />
          <InfoRow label="Matter"         value={matter?.title || "—"} />
          <InfoRow label="Billing Type"   value={String(l?.billingType ?? "—")} />
          <InfoRow label="Amount"         value={l?.fixedBillingAmount ? formatCurrency(Number(l.fixedBillingAmount)) : "Hourly rate"} />
          <InfoRow label="Agreement Date" value={l?.agreementDate ? formatDate(String(l.agreementDate)) : "—"} />
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: "Overview",
          content: (
            <Paper variant="outlined" sx={{ p:2.5, borderRadius:2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight:600, mb:2 }}>Fee Agreement Details</Typography>
              <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", md:"1fr 1fr" }, gap:2 }}>
                <InfoRow label="Agreement Title" value={String(l?.lfaTitle ?? "—")} />
                <InfoRow label="Status"          value={<StatusBadge status={String(l?.lfaStatus ?? "")} />} />
                <InfoRow label="Payment Terms"   value={String(l?.paymentTerms ?? "—")} />
                <InfoRow label="Currency"        value={String(l?.currency ?? "AED")} />
                {!!l?.notes && <InfoRow label="Notes" value={String(l.notes)} />}
              </Box>
            </Paper>
          ),
        },
      ]} />
    </PageShell>
  )
}
