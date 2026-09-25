"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Box, CircularProgress, LinearProgress, Paper, Typography,
} from "@mui/material"
import { mattersApi } from "@/api/matters"
import { formatCurrency } from "@lib/utils/formatCurrency"

function toAmount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function toInt(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

/** Normalize hours + minutes; minutes stay 0–59. Sign preserved for negative balance. */
function normalizeHm(hours: number, minutes: number) {
  const total = hours * 60 + minutes
  const sign = total < 0 ? -1 : 1
  const abs = Math.abs(total)
  return { hours: sign * Math.floor(abs / 60), minutes: sign * (abs % 60) }
}

function formatHm(hours: number, minutes: number): string {
  const { hours: h, minutes: m } = normalizeHm(hours, minutes)
  const neg = h < 0 || m < 0
  const ah = Math.abs(h)
  const am = Math.abs(m)
  const prefix = neg ? "-" : ""
  if (am === 0) return `${prefix}${ah}h`
  return `${prefix}${ah}h ${String(am).padStart(2, "0")}m`
}

function totalMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

interface Props {
  matterId: string
}

export function MatterBillingWidgets({ matterId }: Props) {
  const revenueQuery = useQuery({
    queryKey: ["matters", "revenue", matterId],
    queryFn: () => mattersApi.getRevenue(matterId),
    enabled: !!matterId,
  })
  const retainerQuery = useQuery({
    queryKey: ["matters", "retainer-summary", matterId],
    queryFn: () => mattersApi.getRetainerStatementSummary(matterId, true),
    enabled: !!matterId,
  })

  const revenue = revenueQuery.data ?? {}
  const invoiced = toAmount(revenue.invoiced ?? revenue.billedAmount ?? revenue.billed)
  const wip = toAmount(revenue.wipAmount ?? revenue.wip)
  const outstanding = revenue.outstanding != null ? toAmount(revenue.outstanding) : null
  const collected = revenue.collected != null ? toAmount(revenue.collected) : null
  const estimate = toAmount(revenue.estimate)
  const cap = toAmount(revenue.capAmount ?? revenue.cap)
  const fixedFee = toAmount(revenue.fixedFee)
  const billingType = String(revenue.billingType ?? "")
  const displayWip = billingType === "Fixed" || billingType === "Session" ? 0 : wip
  const used = invoiced + displayWip
  const reference =
    cap > 0 ? { label: "Cap", amount: cap }
      : estimate > 0 ? { label: "Estimate", amount: estimate }
        : fixedFee > 0 ? { label: "Fixed Fee", amount: fixedFee }
          : used > 0 ? { label: "Total", amount: used }
            : null
  const progressPct = reference && reference.amount > 0
    ? Math.min(100, Math.round((used / reference.amount) * 100))
    : 0
  const hasRevenue =
    invoiced > 0 || displayWip > 0 || cap > 0 || estimate > 0 || fixedFee > 0
    || (outstanding != null && outstanding > 0)
    || (collected != null && collected > 0)

  const retainer = retainerQuery.data
  const retainerApplicable = retainer?.applicable === true
  const maxHr = toInt(retainer?.maxRetainerHr)
  const maxMin = toInt(retainer?.maxRetainerMin)
  const usedHr = toInt(retainer?.totalHoursUtilizedHr)
  const usedMin = toInt(retainer?.totalHoursUtilizedMin)
  const wipHr = toInt(retainer?.totalWipHr)
  const wipMin = toInt(retainer?.totalWipMin)
  const balHr = toInt(retainer?.balanceRetainerHr)
  const balMin = toInt(retainer?.balanceRetainerMin)
  const maxTotal = Math.max(1, totalMinutes(maxHr, maxMin))
  const usedTotal = totalMinutes(usedHr, usedMin) + totalMinutes(wipHr, wipMin)
  const retainerPct = Math.min(100, Math.round((usedTotal / maxTotal) * 100))

  const showRevenueBlock = revenueQuery.isLoading || revenueQuery.isError || hasRevenue
  const showRetainerBlock = retainerQuery.isLoading || retainerApplicable

  if (!showRevenueBlock && !showRetainerBlock) return null

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {showRevenueBlock && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Billing</Typography>
          {revenueQuery.isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {revenueQuery.isError && (
            <Typography variant="body2" color="error">Could not load billing summary</Typography>
          )}
          {!revenueQuery.isLoading && !revenueQuery.isError && !hasRevenue && (
            <Typography variant="body2" color="text.secondary">No billing data for this matter</Typography>
          )}
          {!revenueQuery.isLoading && !revenueQuery.isError && hasRevenue && (
            <>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 1.5,
                mb: reference ? 1.5 : 0,
              }}>
                <Metric label="Billed" value={formatCurrency(invoiced)} />
                {displayWip > 0 && <Metric label="WIP" value={formatCurrency(displayWip)} />}
                {collected != null && <Metric label="Collected" value={formatCurrency(collected)} />}
                {outstanding != null && <Metric label="Outstanding" value={formatCurrency(outstanding)} />}
                {reference && reference.label !== "Total" && (
                  <Metric label={reference.label} value={formatCurrency(reference.amount)} />
                )}
              </Box>
              {reference && (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Used vs {reference.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {progressPct}% · {formatCurrency(used)} / {formatCurrency(reference.amount)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    color={progressPct >= 100 ? "error" : progressPct >= 80 ? "warning" : "primary"}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      )}

      {showRetainerBlock && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Retainer Hours</Typography>
          {retainerQuery.isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!retainerQuery.isLoading && retainerApplicable && (
            <>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 1.5,
                mb: 1.5,
              }}>
                <Metric label="Max" value={formatHm(maxHr, maxMin)} />
                <Metric label="Used" value={formatHm(usedHr, usedMin)} />
                {(wipHr > 0 || wipMin > 0) && (
                  <Metric label="WIP" value={formatHm(wipHr, wipMin)} />
                )}
                <Metric label="Remaining" value={formatHm(balHr, balMin)} />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Hours used</Typography>
                <Typography variant="caption" color="text.secondary">{retainerPct}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={retainerPct}
                color={retainerPct >= 100 ? "error" : retainerPct >= 80 ? "warning" : "primary"}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Box>
  )
}
