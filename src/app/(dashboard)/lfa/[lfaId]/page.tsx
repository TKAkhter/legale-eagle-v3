import { useNavigate, useParams } from "react-router-dom"
import {
  Box, Paper, Chip, Typography, Button, IconButton, Menu, MenuItem,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import CheckIcon from "@mui/icons-material/Check"
import SendIcon from "@mui/icons-material/Send"
import BlockIcon from "@mui/icons-material/Block"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { Can } from "@/components/ui/Can"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { PERMISSIONS } from "@config/permissions"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { lfaApi } from "@/api/lfa"
import { toast } from "@/lib/toast"
import { LfaFormDrawer } from "../_components/LfaFormDrawer"
import { LfaRatesDialog } from "../_components/LfaRatesDialog"
import { SendForSignatureDialog } from "../_components/SendForSignatureDialog"
import { SendForApprovalDialog } from "../_components/SendForApprovalDialog"

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

function hasValue(v: unknown): boolean {
  if (v == null || v === "") return false
  if (typeof v === "boolean") return v
  return true
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  )
}

function FeeStructureOverview({ l }: { l: Record<string, unknown> }) {
  const showCap = l?.cap === true || (hasValue(l?.capAmount) && Number(l.capAmount) > 0)
  const showRetainer = l?.retainer === true || hasValue(l?.retainerAmount) || hasValue(l?.retainerMaximumHr)
  const showReferral = l?.referral === true || hasValue(l?.referralPercentage) || hasValue(l?.referralSource)
  const showEnforcement = l?.enforcement === true || hasValue(l?.enforcementAmount)
  const breakdownRows = (
    Array.isArray(l?.fixedRate) ? l.fixedRate
      : Array.isArray(l?.breakDownList) ? l.breakDownList
        : Array.isArray(l?.breakdown) ? l.breakdown
          : []
  ) as Record<string, unknown>[]
  const showBreakdown = l?.breakDown === true || breakdownRows.length > 0
  const breakDownType = String(l?.breakDownType ?? "Amount")

  if (!showCap && !showRetainer && !showReferral && !showEnforcement && !showBreakdown) {
    return (
      <Typography variant="body2" color="text.secondary">
        No cap, retainer, referral, or breakdown configured on this agreement.
      </Typography>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        {(showCap || showRetainer) && (
          <SummaryCard title="Cap & Retainer">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
              {showCap ? (
                <>
                  <InfoRow label="Cap" value="Yes" />
                  <InfoRow label="Cap Amount" value={formatCurrency(Number(l?.capAmount ?? l?.cap ?? 0))} />
                  {hasValue(l?.threshold) && (
                    <InfoRow
                      label="Threshold"
                      value={
                        hasValue(l?.capThresholdType) && String(l.capThresholdType) === "Amount"
                          ? formatCurrency(Number(l.threshold))
                          : `${l.threshold}%`
                      }
                    />
                  )}
                  {hasValue(l?.capNotificationAmount) && (
                    <InfoRow label="Cap Notification" value={formatCurrency(Number(l.capNotificationAmount))} />
                  )}
                </>
              ) : (
                <InfoRow label="Cap" value="No" />
              )}
              {showRetainer ? (
                <>
                  <InfoRow label="Retainer" value="Yes" />
                  {hasValue(l?.retainerAmount) && (
                    <InfoRow label="Retainer Amount" value={formatCurrency(Number(l.retainerAmount))} />
                  )}
                  {hasValue(l?.retainerValidity) && (
                    <InfoRow
                      label="Validity"
                      value={`${String(l.retainerValidityDuration ?? "")} ${String(l.retainerValidity)}`.trim()}
                    />
                  )}
                  {hasValue(l?.retainerMaximumHr) && (
                    <InfoRow label="Max Hours" value={String(l.retainerMaximumHr)} />
                  )}
                  {hasValue(l?.retainerEndDate) && (
                    <InfoRow label="Retainer End" value={formatDate(String(l.retainerEndDate))} />
                  )}
                </>
              ) : (
                <InfoRow label="Retainer" value="No" />
              )}
            </Box>
          </SummaryCard>
        )}

        {(showReferral || showEnforcement) && (
          <SummaryCard title="Referral & Enforcement">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
              {showReferral ? (
                <>
                  <InfoRow label="Referral" value="Yes" />
                  {hasValue(l?.referralPercentage) && (
                    <InfoRow label="Referral %" value={`${l.referralPercentage}%`} />
                  )}
                  {hasValue(l?.referralSource) && (
                    <InfoRow label="Source" value={String(l.referralSource)} />
                  )}
                </>
              ) : (
                <InfoRow label="Referral" value="No" />
              )}
              {showEnforcement ? (
                <>
                  <InfoRow label="Enforcement" value="Yes" />
                  {hasValue(l?.enforcementAmount) && (
                    <InfoRow label="Enforcement Amount" value={formatCurrency(Number(l.enforcementAmount))} />
                  )}
                </>
              ) : null}
            </Box>
          </SummaryCard>
        )}
      </Box>

      {showBreakdown && (
        <SummaryCard title="Rates Breakdown">
          <InfoRow
            label="Breakdown Type"
            value={breakDownType || (l?.breakDown === true ? "Enabled" : "—")}
          />
          {breakdownRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No breakdown line items.</Typography>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              {breakdownRows.map((row, i) => {
                const name = String(row.title ?? row.name ?? row.breakDownName ?? row.breakDown ?? `Item ${i + 1}`)
                const amount = Number(row.amount ?? row.rate ?? 0)
                const pct = row.percentage != null ? Number(row.percentage) : null
                return (
                  <Box
                    key={String(row.id ?? row.breakDown ?? i)}
                    sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", py: 1, borderBottom: "1px solid", borderColor: "divider", gap: 2 }}
                  >
                    <Typography variant="body2">{name}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {breakDownType === "Percentage" && pct != null
                        ? `${pct}%`
                        : formatCurrency(amount)}
                      {breakDownType !== "Percentage" && pct != null ? ` (${pct}%)` : ""}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          )}
        </SummaryCard>
      )}
    </Box>
  )
}

export default function LfaDetailPage() {
  const { lfaId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [sigOpen, setSigOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

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

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["lfa", "detail", lfaId] })
    qc.invalidateQueries({ queryKey: ["lfa"] })
  }

  if (isLoading) return <PageShell title="LFA"><DetailSkeleton /></PageShell>

  const l = lfa as Record<string, unknown>
  const client = (l?.client ?? l?.clients) as { companyName?: string; firstName?: string; lastName?: string } | null
  const matter = l?.matter as { title?: string } | null
  const rates = (Array.isArray(ratesQ.data) ? ratesQ.data : (l?.rates as unknown[]) ?? []) as Record<string, unknown>[]
  const status = String(l?.lfaStatus ?? "")
  const billingType = String(l?.billingType ?? "")
  const isDraft = status === "Draft" || status === "Approve"
  const isApproved = status === "Approved" || status === "Active"
  const canCancel = status === "Draft" || status === "Approve"
  const showCap = l?.cap === true || (hasValue(l?.capAmount) && Number(l.capAmount) > 0)
  const showRetainer = l?.retainer === true || hasValue(l?.retainerAmount) || hasValue(l?.retainerMaximumHr)
  const showReferral = l?.referral === true || hasValue(l?.referralPercentage) || hasValue(l?.referralSource)
  const showBreakdown = l?.breakDown === true
    || (Array.isArray(l?.fixedRate) && (l.fixedRate as unknown[]).length > 0)
    || (Array.isArray(l?.breakDownList) && (l.breakDownList as unknown[]).length > 0)
    || (Array.isArray(l?.breakdown) && (l.breakdown as unknown[]).length > 0)

  function openEditOrAmend() {
    if (isApproved) {
      navigate(`/lfa/${lfaId}/amend`)
      return
    }
    setEditOpen(true)
  }

  return (
    <PageShell
      title={String(l?.lfaTitle ?? l?.agreementNo ?? "LFA")}
      description={`Fee Agreement • ${String(l?.agreementNo ?? "")}`}
      breadcrumbs={[{ label: "LFA", path: "/lfa" }, { label: String(l?.lfaTitle ?? "Detail") }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {billingType !== "Fixed" && (
            <Button size="small" variant="outlined" onClick={() => setRatesOpen(true)}>View Rates</Button>
          )}
          {isDraft && (
            <Can do={PERMISSIONS.LFA_APPROVE}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CheckIcon />}
                onClick={async () => {
                  try {
                    toast.success(await lfaApi.approve(String(lfaId), "Approved"))
                    invalidate()
                  } catch { toast.error("Approve failed") }
                }}
              >
                Approve
              </Button>
            </Can>
          )}
          {status === "Draft" && (
            <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => setApprovalOpen(true)}>
              Send for Approval
            </Button>
          )}
          <Can do={PERMISSIONS.LFA_EDIT}>
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              onClick={openEditOrAmend}
            >
              {isApproved ? "Amend" : "Edit"}
            </Button>
          </Can>
          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="More actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {isApproved && (
              <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/lfa/${lfaId}/amend`) }}>
                Amend
              </MenuItem>
            )}
            {isApproved && (
              <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/lfa/${lfaId}/partial-amend`) }}>
                Partial Amend
              </MenuItem>
            )}
            {(isDraft || isApproved) && (
              <MenuItem onClick={() => { setMenuAnchor(null); setSigOpen(true) }}>
                Send for Signature
              </MenuItem>
            )}
            {canCancel && (
              <MenuItem onClick={() => { setMenuAnchor(null); setCancelOpen(true) }}>
                Cancel
              </MenuItem>
            )}
            <MenuItem
              onClick={async () => {
                setMenuAnchor(null)
                try {
                  toast.success(await lfaApi.setInactive(String(lfaId)))
                  invalidate()
                } catch { toast.error("Status update failed") }
              }}
            >
              <BlockIcon fontSize="small" sx={{ mr: 1 }} /> Toggle Active
            </MenuItem>
          </Menu>
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
          <StatusBadge status={status || String(l?.current ? "Active" : "Draft")} />
          <Chip size="small" label={billingType || "—"} variant="outlined" />
          {!!l?.current && <Chip size="small" label="Current" color="success" />}
          {showCap && <Chip size="small" label="Cap" variant="outlined" />}
          {showRetainer && <Chip size="small" label="Retainer" color="info" variant="outlined" />}
          {showReferral && <Chip size="small" label="Referral" variant="outlined" />}
          {showBreakdown && <Chip size="small" label="Breakdown" variant="outlined" />}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          <InfoRow label="Agreement No." value={String(l?.agreementNo ?? "—")} />
          <InfoRow label="Client" value={client?.companyName || `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() || "—"} />
          <InfoRow label="Matter" value={matter?.title || "—"} />
          <InfoRow label="Billing Type" value={billingType || "—"} />
          <InfoRow label="Amount" value={l?.fixedBillingAmount != null ? formatCurrency(Number(l.fixedBillingAmount)) : (l?.fixedFee != null ? formatCurrency(Number(l.fixedFee)) : "Hourly")} />
          <InfoRow label="Agreement Date" value={l?.agreementDate ? formatDate(String(l.agreementDate)) : "—"} />
          <InfoRow label="Applicable Date" value={l?.applicableDate ? formatDate(String(l.applicableDate)) : "—"} />
          <InfoRow
            label="Cap"
            value={showCap ? formatCurrency(Number(l?.capAmount ?? 0)) : "—"}
          />
          <InfoRow label="Contingent" value={l?.contingent != null ? `${l.contingent}%` : "—"} />
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: "Overview",
          content: (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Fee Agreement Details</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <InfoRow label="Agreement Title" value={String(l?.lfaTitle ?? "—")} />
                  <InfoRow label="Scope" value={String(l?.scope ?? l?.description ?? "—")} />
                  <InfoRow label="Status" value={<StatusBadge status={status} />} />
                  <InfoRow label="Payment Terms" value={String(l?.paymentTerms ?? "—")} />
                  <InfoRow label="Currency" value={String(l?.currency ?? "AED")} />
                  <InfoRow label="Advance" value={l?.advance != null ? formatCurrency(Number(l.advance)) : "—"} />
                  <InfoRow label="Non Contingent" value={l?.nonContingent != null ? `${l.nonContingent}%` : "—"} />
                  <InfoRow label="Success Rate" value={l?.successRate != null ? `${l.successRate}%` : "—"} />
                  <InfoRow label="Matter Count" value={String(l?.matterCount ?? "—")} />
                  {!!l?.notes && <InfoRow label="Notes" value={String(l.notes)} />}
                </Box>
              </Paper>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Fee Structure</Typography>
                <FeeStructureOverview l={l} />
              </Box>
            </Box>
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
          invalidate()
        }}
      />
      <LfaRatesDialog open={ratesOpen} lfaId={String(lfaId)} onClose={() => setRatesOpen(false)} />
      <SendForApprovalDialog
        open={approvalOpen}
        lfaId={String(lfaId)}
        onClose={() => setApprovalOpen(false)}
        onSent={() => {
          setApprovalOpen(false)
          invalidate()
        }}
      />
      {sigOpen && (
        <SendForSignatureDialog
          open={sigOpen}
          onClose={() => setSigOpen(false)}
          lfa={l}
          onSent={() => {
            setSigOpen(false)
            invalidate()
          }}
        />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          toast.success(await lfaApi.approve(String(lfaId), "Cancel"))
          invalidate()
        }}
        title="Cancel LFA"
        message="Are you sure you want to cancel this fee agreement?"
        confirmLabel="Cancel LFA"
        severity="error"
      />
    </PageShell>
  )
}
