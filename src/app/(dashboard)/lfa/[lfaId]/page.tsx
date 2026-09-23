import { useParams } from "react-router-dom"
import { Box, Paper, Chip, Typography, Button } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { Can } from "@/components/ui/Can"
import { PERMISSIONS } from "@config/permissions"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { lfaApi } from "@/api/lfa"
import { toast } from "@/lib/toast"
import { LfaFormDrawer } from "../_components/LfaFormDrawer"
import { LfaRatesDialog } from "../_components/LfaRatesDialog"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

export default function LfaDetailPage() {
  const { lfaId } = useParams()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)

  const { data: lfa, isLoading } = useQuery({
    queryKey: ["lfa", "detail", lfaId],
    queryFn: () => lfaApi.getById(String(lfaId)),
    enabled: !!lfaId,
  })

  const ratesQ = useQuery({
    queryKey: ["lfa", "rates", lfaId],
    queryFn: () => lfaApi.getRates(String(lfaId)),
    enabled: !!lfaId,
  })

  if (isLoading) return <PageShell title="LFA"><DetailSkeleton /></PageShell>

  const l = lfa as Record<string, unknown>
  const client = (l?.client ?? l?.clients) as { companyName?: string; firstName?: string; lastName?: string } | null
  const matter = l?.matter as { title?: string } | null
  const rates = (Array.isArray(ratesQ.data) ? ratesQ.data : (l?.rates as unknown[]) ?? []) as Record<string, unknown>[]
  const status = String(l?.lfaStatus ?? "")

  return (
    <PageShell
      title={String(l?.lfaTitle ?? l?.agreementNo ?? "LFA")}
      description={`Fee Agreement • ${String(l?.agreementNo ?? "")}`}
      breadcrumbs={[{ label: "LFA", path: "/lfa" }, { label: String(l?.lfaTitle ?? "Detail") }]}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          {String(l?.billingType) !== "Fixed" && (
            <Button size="small" variant="outlined" onClick={() => setRatesOpen(true)}>View Rates</Button>
          )}
          <Can do={PERMISSIONS.LFA_EDIT}>
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                if (status === "Approved") {
                  toast.info("LFA already approved — use Amend from the list.")
                  return
                }
                setEditOpen(true)
              }}
            >
              Edit
            </Button>
          </Can>
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
          <StatusBadge status={status || String(l?.current ? "Active" : "Draft")} />
          <Chip size="small" label={String(l?.billingType ?? "")} variant="outlined" />
          {!!l?.current && <Chip size="small" label="Current" color="success" />}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          <InfoRow label="Agreement No." value={String(l?.agreementNo ?? "—")} />
          <InfoRow label="Client" value={client?.companyName || `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() || "—"} />
          <InfoRow label="Matter" value={matter?.title || "—"} />
          <InfoRow label="Billing Type" value={String(l?.billingType ?? "—")} />
          <InfoRow label="Amount" value={l?.fixedBillingAmount != null ? formatCurrency(Number(l.fixedBillingAmount)) : (l?.fixedFee != null ? formatCurrency(Number(l.fixedFee)) : "Hourly")} />
          <InfoRow label="Agreement Date" value={l?.agreementDate ? formatDate(String(l.agreementDate)) : "—"} />
          <InfoRow label="Applicable Date" value={l?.applicableDate ? formatDate(String(l.applicableDate)) : "—"} />
          <InfoRow label="Cap" value={l?.cap != null ? formatCurrency(Number(l.cap)) : "—"} />
          <InfoRow label="Contingent" value={l?.contingent != null ? `${l.contingent}%` : "—"} />
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: "Overview",
          content: (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Fee Agreement Details</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <InfoRow label="Agreement Title" value={String(l?.lfaTitle ?? "—")} />
                <InfoRow label="Scope" value={String(l?.scope ?? l?.description ?? "—")} />
                <InfoRow label="Status" value={<StatusBadge status={status} />} />
                <InfoRow label="Payment Terms" value={String(l?.paymentTerms ?? "—")} />
                <InfoRow label="Currency" value={String(l?.currency ?? "AED")} />
                <InfoRow label="Advance" value={l?.advance != null ? formatCurrency(Number(l.advance)) : "—"} />
                <InfoRow label="Success Rate" value={l?.successRate != null ? `${l.successRate}%` : "—"} />
                <InfoRow label="Matter Count" value={String(l?.matterCount ?? "—")} />
                {!!l?.notes && <InfoRow label="Notes" value={String(l.notes)} />}
              </Box>
            </Paper>
          ),
        },
        {
          label: "Rates",
          content: (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              {rates.length === 0 ? (
                <Typography color="text.secondary">No rates configured.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {rates.map((r, i) => {
                    const des = r.designation as { name?: string } | string | null
                    const name = typeof des === "string" ? des : des?.name ?? String(r.name ?? "—")
                    return (
                      <Box key={String(r.id ?? i)} sx={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider", pb: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                          <Typography variant="caption" color="text.secondary">{String(r.billingType ?? "")}</Typography>
                        </Box>
                        <Typography variant="body2">{formatCurrency(Number(r.rate ?? r.hourlyRate ?? 0))}</Typography>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Paper>
          ),
        },
      ]} />

      <LfaFormDrawer
        open={editOpen}
        lfaId={String(lfaId)}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["lfa", "detail", lfaId] })
        }}
      />
      <LfaRatesDialog open={ratesOpen} lfaId={String(lfaId)} onClose={() => setRatesOpen(false)} />
    </PageShell>
  )
}
