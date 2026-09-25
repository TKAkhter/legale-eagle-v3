import type { ReactNode } from "react"
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import RefreshIcon from "@mui/icons-material/Refresh"
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined"
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded"
import { formatCurrency } from "@lib/utils/formatCurrency"

/** Raw section from GET /api/invoice/client/revenue/v2 */
export interface ClientRevenueSection {
  invoiced?: number | null
  billedAmount?: number | null
  wipAmount?: number | null
  estimate?: number | null
  capAmount?: number | null
  fixedFee?: number | null
  actualAmount?: number | null
  revenueAllocated?: number | null
  deferredRevenue?: number | null
  discountedRevenue?: number | null
  billingType?: string | null
}

/** Full v2 revenue payload (plus legacy summary fields used on the Home header). */
export interface ClientRevenuePayload {
  billed?: number | null
  collected?: number | null
  outstanding?: number | null
  hourly?: ClientRevenueSection | null
  fixedSession?: ClientRevenueSection | null
}

type BillingKind = "Hourly" | "Fixed" | "Session"
type ReferenceType = "Cap" | "Estimate" | "Fixed Fee" | "Total"

interface MappedSection {
  billingType: BillingKind
  invoiced: number
  wipAmount: number
  estimate: number
  capAmount: number
  fixedFee: number
  revenueAllocated: number
  deferredRevenue: number
  discountedRevenue: number
}

export interface MappedClientThresholdRevenue {
  hasHourlyData: boolean
  hasFixedSessionData: boolean
  hasBillingData: boolean
  hourly: MappedSection | null
  fixedSession: MappedSection | null
}

function toAmount(amount: unknown): number {
  const n = Number(amount)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function hasActualAmounts(amounts: unknown[]): boolean {
  return amounts.some(a => toAmount(a) > 0)
}

export function hasActualHourlyBillingData(hourly: ClientRevenueSection | null | undefined): boolean {
  if (!hourly || typeof hourly !== "object") return false
  return hasActualAmounts([
    hourly.invoiced,
    hourly.billedAmount,
    hourly.wipAmount,
    hourly.estimate,
    hourly.capAmount,
    hourly.fixedFee,
    hourly.actualAmount,
  ])
}

export function hasActualFixedSessionBillingData(
  fixedSession: ClientRevenueSection | null | undefined,
): boolean {
  if (!fixedSession || typeof fixedSession !== "object") return false
  return hasActualAmounts([
    fixedSession.invoiced,
    fixedSession.billedAmount,
    fixedSession.fixedFee,
    fixedSession.estimate,
    fixedSession.capAmount,
    fixedSession.revenueAllocated,
    fixedSession.deferredRevenue,
    fixedSession.wipAmount,
    fixedSession.discountedRevenue,
    fixedSession.actualAmount,
  ])
}

export function mapHourlyClientRevenue(hourly: ClientRevenueSection = {}): MappedSection {
  return {
    billingType: "Hourly",
    invoiced: toAmount(hourly.invoiced ?? hourly.billedAmount),
    wipAmount: toAmount(hourly.wipAmount),
    estimate: toAmount(hourly.estimate),
    capAmount: toAmount(hourly.capAmount),
    fixedFee: toAmount(hourly.fixedFee),
    revenueAllocated: 0,
    deferredRevenue: 0,
    discountedRevenue: 0,
  }
}

export function mapFixedSessionClientRevenue(fixedSession: ClientRevenueSection = {}): MappedSection {
  const billingType: BillingKind =
    fixedSession.billingType === "Session" ? "Session" : "Fixed"
  return {
    billingType,
    invoiced: toAmount(fixedSession.invoiced ?? fixedSession.billedAmount),
    fixedFee: toAmount(fixedSession.fixedFee),
    estimate: toAmount(fixedSession.estimate),
    capAmount: toAmount(fixedSession.capAmount),
    revenueAllocated: toAmount(fixedSession.revenueAllocated),
    deferredRevenue: toAmount(fixedSession.deferredRevenue),
    wipAmount: toAmount(fixedSession.wipAmount),
    discountedRevenue: toAmount(fixedSession.discountedRevenue),
  }
}

/** Map Client revenue v2 payload for threshold bars (Hourly / Fixed / Session). */
export function mapClientThresholdRevenue(
  payload: ClientRevenuePayload | null | undefined = {},
): MappedClientThresholdRevenue {
  const hourly = payload?.hourly
  const fixedSession = payload?.fixedSession
  const hasHourlyData = hasActualHourlyBillingData(hourly)
  const hasFixedSessionData = hasActualFixedSessionBillingData(fixedSession)
  return {
    hasHourlyData,
    hasFixedSessionData,
    hasBillingData: hasHourlyData || hasFixedSessionData,
    hourly: hasHourlyData ? mapHourlyClientRevenue(hourly ?? {}) : null,
    fixedSession: hasFixedSessionData ? mapFixedSessionClientRevenue(fixedSession ?? {}) : null,
  }
}

function resolveReference(section: MappedSection): { type: ReferenceType; amount: number } {
  if (section.capAmount > 0) return { type: "Cap", amount: section.capAmount }
  if (section.estimate > 0) return { type: "Estimate", amount: section.estimate }
  if (section.fixedFee > 0) return { type: "Fixed Fee", amount: section.fixedFee }
  const isFixed = section.billingType === "Fixed" || section.billingType === "Session"
  const amount = isFixed
    ? section.invoiced + section.wipAmount
    : section.wipAmount > 0
      ? section.invoiced + section.wipAmount
      : section.invoiced
  return { type: "Total", amount: Math.max(amount, 0) }
}

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0
}

function LegendSwatch({ color, label, hatched }: { color: string; label: string; hatched?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box
        sx={{
          width: 14,
          height: 10,
          borderRadius: 0.25,
          bgcolor: hatched ? "grey.100" : color,
          border: hatched ? "1px solid" : undefined,
          borderColor: hatched ? "grey.400" : undefined,
          ...(hatched && {
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 3px)`,
          }),
        }}
      />
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

function Metric({ label, amount, percent }: { label: string; amount: number; percent?: number | null }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {label}:{" "}
      <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
        {formatCurrency(amount)}
      </Box>
      {percent != null && (
        <Box component="span" sx={{ ml: 0.75, fontSize: "0.8125rem" }}>
          ({percent.toFixed(1)}%)
        </Box>
      )}
    </Typography>
  )
}

function HourlyBar({ section }: { section: MappedSection }) {
  const theme = useTheme()
  const ref = resolveReference(section)
  const maxValue = ref.amount
  const showThreshold = ref.type === "Cap" || ref.type === "Estimate"
  const used = section.invoiced + section.wipAmount
  const scale = showThreshold && used > maxValue ? used : Math.max(maxValue, used, 1)
  const invoicedW = pct(section.invoiced, scale)
  const wipWithin = Math.max(0, Math.min(section.wipAmount, Math.max(0, maxValue - section.invoiced)))
  const wipBeyond = Math.max(0, section.wipAmount - wipWithin)
  const wipW = showThreshold ? pct(wipWithin, scale) : pct(section.wipAmount, scale)
  const overflowW = showThreshold ? pct(wipBeyond, scale) : used > maxValue ? Math.min(pct(used - maxValue, scale), 20) : 0
  const markerPos = showThreshold && scale > 0 ? pct(maxValue, scale) : null
  const totalUsedPct = pct(used, maxValue)
  const exceeded = showThreshold && totalUsedPct > 100

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", mb: 1.5 }}>
        <Metric label="Invoiced" amount={section.invoiced} percent={pct(section.invoiced, maxValue)} />
        {section.wipAmount > 0 && (
          <Metric label="WIP" amount={section.wipAmount} percent={pct(section.wipAmount, maxValue)} />
        )}
        <Metric label={ref.type === "Fixed Fee" ? "Fixed Fee" : ref.type === "Total" ? "Total" : `${ref.type} Amount`} amount={maxValue} />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
        <LegendSwatch color="#1976D2" label="Invoiced" />
        {section.wipAmount > 0 && <LegendSwatch color={theme.palette.warning.main} label="WIP" />}
        <LegendSwatch color={theme.palette.grey[300]} label="Remaining" />
        {overflowW > 0 && <LegendSwatch color={theme.palette.error.main} label="Overflow" />}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, pt: showThreshold ? 3 : 0, pb: showThreshold ? 4 : 0 }}>
        <Box sx={{ flex: 1, position: "relative", minWidth: 0 }}>
          <Box
            sx={{
              height: 13,
              bgcolor: "grey.300",
              borderRadius: 0.25,
              overflow: "hidden",
              display: "flex",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {invoicedW > 0 && (
              <Tooltip title={`Invoiced: ${formatCurrency(section.invoiced)}`} arrow>
                <Box sx={{ width: `${invoicedW}%`, height: "100%", bgcolor: "#1976D2", cursor: "help" }} />
              </Tooltip>
            )}
            {wipW > 0 && (
              <Tooltip title={`WIP: ${formatCurrency(showThreshold ? wipWithin : section.wipAmount)}`} arrow>
                <Box sx={{ width: `${wipW}%`, height: "100%", bgcolor: "warning.main", cursor: "help" }} />
              </Tooltip>
            )}
            {overflowW > 0 && (
              <Tooltip title={`Overflow: ${formatCurrency(showThreshold ? wipBeyond : used - maxValue)}`} arrow>
                <Box sx={{ width: `${overflowW}%`, height: "100%", bgcolor: "error.main", cursor: "help" }} />
              </Tooltip>
            )}
          </Box>

          {markerPos != null && (
            <Box
              sx={{
                position: "absolute",
                left: `${markerPos}%`,
                top: -28,
                bottom: -36,
                width: 0,
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translateX(-50%)",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: "grey.800",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                <Typography sx={{ fontSize: "0.625rem", fontWeight: 600, lineHeight: 1.2 }}>
                  {ref.type}
                </Typography>
                <Typography sx={{ fontSize: "0.625rem", opacity: 0.92, lineHeight: 1.2 }}>
                  {formatCurrency(maxValue)}
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 34,
                  bottom: 28,
                  width: 2,
                  transform: "translateX(-50%)",
                  bgcolor: "grey.800",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  transform: "translateX(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.35,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  bgcolor: exceeded ? "#FDECEC" : "#E8F5E9",
                  color: exceeded ? "#D32F2F" : "#2E7D32",
                }}
              >
                {exceeded
                  ? <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />
                  : <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                  {exceeded ? `Exceeds ${ref.type}` : `Within ${ref.type}`}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: totalUsedPct > 100 ? 600 : 500,
            color: totalUsedPct > 100 ? "error.main" : "text.secondary",
            whiteSpace: "nowrap",
            mt: showThreshold ? 3 : 0,
          }}
        >
          {totalUsedPct.toFixed(1)}% Used
        </Typography>
      </Box>
    </Box>
  )
}

function FixedSessionBar({ section }: { section: MappedSection }) {
  const ref = resolveReference(section)
  const recognized = section.revenueAllocated
  const deferred = section.deferredRevenue
  const unrecognized = section.wipAmount
  const discounted = section.discountedRevenue
  const segmentTotal = recognized + deferred + unrecognized + discounted
  const usedAmount = Math.max(section.invoiced, segmentTotal)
  const threshold = ref.amount
  const scale = usedAmount > threshold ? usedAmount : Math.max(threshold, segmentTotal, 1)
  const widths = {
    recognized: pct(recognized, scale),
    deferred: pct(deferred, scale),
    unrecognized: pct(unrecognized, scale),
    discounted: pct(discounted, scale),
  }
  const markerPos = threshold > 0 ? pct(threshold, scale) : null
  const invoicedPct = pct(section.invoiced, threshold || scale)
  const exceeded = threshold > 0 && section.invoiced > threshold

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", mb: 1.5 }}>
        <Metric label="Invoiced" amount={section.invoiced} percent={threshold > 0 ? invoicedPct : null} />
        <Metric
          label={ref.type === "Fixed Fee" ? "Fixed Fee" : ref.type === "Total" ? "Total" : `${ref.type} Amount`}
          amount={threshold || scale}
        />
        {section.fixedFee > 0 && (ref.type === "Cap" || ref.type === "Estimate") && (
          <Typography variant="body2" color="text.secondary">
            (Fixed Fee: {formatCurrency(section.fixedFee)})
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
        <LegendSwatch color="#1976D2" label="Recognised Revenue" />
        <LegendSwatch color="#BDBDBD" label="Deferred Revenue" />
        <LegendSwatch color="#FB8C00" label="Unrecognised Revenue" />
        <LegendSwatch color="#D32F2F" label="Discounted" />
        <LegendSwatch color="#f5f5f5" label="Remaining" hatched />
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, pt: 3, pb: 4 }}>
        <Box sx={{ flex: 1, position: "relative", minWidth: 0 }}>
          <Box
            sx={{
              height: 13,
              bgcolor: "grey.100",
              borderRadius: 0.25,
              overflow: "hidden",
              display: "flex",
              border: "1px solid",
              borderColor: "grey.300",
              backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)`,
            }}
          >
            {widths.recognized > 0 && (
              <Tooltip title={`Recognised: ${formatCurrency(recognized)}`} arrow>
                <Box sx={{ width: `${widths.recognized}%`, height: "100%", bgcolor: "#1976D2", cursor: "help" }} />
              </Tooltip>
            )}
            {widths.deferred > 0 && (
              <Tooltip title={`Deferred: ${formatCurrency(deferred)}`} arrow>
                <Box sx={{ width: `${widths.deferred}%`, height: "100%", bgcolor: "#BDBDBD", cursor: "help" }} />
              </Tooltip>
            )}
            {widths.unrecognized > 0 && (
              <Tooltip title={`Unrecognised: ${formatCurrency(unrecognized)}`} arrow>
                <Box sx={{ width: `${widths.unrecognized}%`, height: "100%", bgcolor: "#FB8C00", cursor: "help" }} />
              </Tooltip>
            )}
            {widths.discounted > 0 && (
              <Tooltip title={`Discounted: ${formatCurrency(discounted)}`} arrow>
                <Box sx={{ width: `${widths.discounted}%`, height: "100%", bgcolor: "#D32F2F", cursor: "help" }} />
              </Tooltip>
            )}
          </Box>

          {markerPos != null && (
            <Box
              sx={{
                position: "absolute",
                left: `${markerPos}%`,
                top: -28,
                bottom: -36,
                width: 0,
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translateX(-50%)",
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: "grey.800",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                <Typography sx={{ fontSize: "0.625rem", fontWeight: 600, lineHeight: 1.2 }}>
                  {ref.type}
                </Typography>
                <Typography sx={{ fontSize: "0.625rem", opacity: 0.92, lineHeight: 1.2 }}>
                  {formatCurrency(threshold)}
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 34,
                  bottom: 28,
                  width: 2,
                  transform: "translateX(-50%)",
                  bgcolor: "grey.800",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  transform: "translateX(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.35,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  bgcolor: exceeded ? "#FDECEC" : "#E8F5E9",
                  color: exceeded ? "#D32F2F" : "#2E7D32",
                }}
              >
                {exceeded
                  ? <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />
                  : <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                  {exceeded ? `Exceeds ${ref.type}` : `Within ${ref.type}`}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: invoicedPct > 100 ? 600 : 500,
            color: invoicedPct > 100 ? "error.main" : "text.secondary",
            whiteSpace: "nowrap",
            mt: 3,
          }}
        >
          {invoicedPct.toFixed(1)}% Used
        </Typography>
      </Box>
    </Box>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 2, borderColor: "divider" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Paper>
  )
}

interface Props {
  revenue?: ClientRevenuePayload | null
  loading?: boolean
  error?: boolean
  onRefresh?: () => void
}

export function ClientBillingThreshold({ revenue, loading, error, onRefresh }: Props) {
  const mapped = mapClientThresholdRevenue(revenue)

  const refreshBtn = onRefresh ? (
    <IconButton size="small" aria-label="Refresh billing data" onClick={onRefresh}>
      <RefreshIcon fontSize="small" />
    </IconButton>
  ) : null

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
        <Typography variant="body2" color="error">Error loading billing data</Typography>
        {refreshBtn}
      </Box>
    )
  }

  if (!mapped.hasBillingData) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          textAlign: "center",
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <InfoOutlinedIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          No billing threshold data for this client
        </Typography>
        {refreshBtn}
      </Paper>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {mapped.hourly && (
        <SectionCard title="Hourly" action={refreshBtn}>
          <HourlyBar section={mapped.hourly} />
        </SectionCard>
      )}
      {mapped.fixedSession && (
        <SectionCard
          title={mapped.fixedSession.billingType}
          action={!mapped.hourly ? refreshBtn : undefined}
        >
          <FixedSessionBar section={mapped.fixedSession} />
        </SectionCard>
      )}
    </Box>
  )
}
