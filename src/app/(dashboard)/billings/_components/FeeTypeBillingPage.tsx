/**
 * Shared Contingent / NonContingent / SuccessRate / Enforcement billing list.
 * LMS parity: remaining amounts, agreement filter, richer columns, Generate gate.
 */
import { useMemo, useState } from "react"
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  LinearProgress,
  Autocomplete,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi, type FeeBillKind } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { FeeTypeBillDrawer } from "../_components/FeeTypeBillDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

const TITLES: Record<FeeBillKind, string> = {
  Contingent: "Contingent Billing",
  NonContingent: "Non-Contingent Billing",
  SuccessRate: "Success Rate Billing",
  Enforcement: "Enforcement Billing",
}

function clientLabel(row: Record<string, unknown>) {
  const c = (row.clients ?? row.client) as Record<string, unknown> | undefined
  if (!c) return "—"
  return String(c.companyName ?? (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"))
}

function remainingOf(row: Record<string, unknown>): number {
  return Number(row.remainingAmount ?? 0)
}

function billedOf(kind: FeeBillKind, row: Record<string, unknown>): number {
  if (kind === "SuccessRate") return Number(row.successRateBilledAmount ?? 0)
  if (kind === "Contingent" || kind === "NonContingent") return Number(row.billedAmount ?? 0)
  return 0
}

function feeTotalOf(kind: FeeBillKind, row: Record<string, unknown>): number {
  if (kind === "SuccessRate") return Number(row.finalFixedFees ?? 0)
  if (kind === "Contingent") return Number(row.contingent ?? 0)
  if (kind === "NonContingent") return Number(row.nonContingent ?? 0)
  return Number(row.enforcementAmount ?? 0)
}

export function FeeTypeBillingPage({ kind }: { kind: FeeBillKind }) {
  const [clientId, setClientId] = useState("")
  const [agreementId, setAgreementId] = useState("")
  const [billingStatus, setBillingStatus] = useState("unbilled")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({ billingStatus: "unbilled" })
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  const lfasQ = useQuery({
    queryKey: ["lfa", "mini", "fee-type", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "sr1", agreementNo: "LFA-003" }, { id: "ct1", agreementNo: "LFA-001" }]
      }
      const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId } })
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string }[]
    },
    staleTime: 60_000,
  })

  const lfaOpts = useMemo(
    () => (lfasQ.data ?? [])
      .map(l => ({ id: String(l.id ?? ""), label: String(l.agreementNo ?? l.id ?? "") }))
      .filter(l => l.id),
    [lfasQ.data],
  )

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "fee-type", kind, filters],
    queryFn: () => billingApi.getFeeTypeRows(kind, filters),
  })

  const headers = useMemo(() => {
    if (kind === "SuccessRate") {
      return ["Agreement", "Date", "Client", "Success Fee", "Billed", "Remaining", "Type", "Scope", ""]
    }
    if (kind === "Enforcement") {
      return ["Agreement", "Date", "Client", "Amount", "Scope", ""]
    }
    return ["Agreement", "Date", "Client", "Fee", "Billed", "Remaining", "Type", "Scope", ""]
  }, [kind])

  return (
    <PageShell
      title={TITLES[kind]}
      description={`Generate ${kind} invoices from LFA fee schedules`}
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: TITLES[kind] }]}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter
            value={clientId}
            onChange={v => {
              setClientId(v ?? "")
              setAgreementId("")
            }}
          />
          <Autocomplete
            size="small"
            sx={{ minWidth: 180 }}
            options={lfaOpts}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={lfaOpts.find(o => o.id === agreementId) ?? null}
            onChange={(_, v) => setAgreementId(v?.id ?? "")}
            disabled={!clientId}
            renderInput={params => <TextField {...params} label="Agreement (LFA)" />}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={billingStatus}
            onChange={e => setBillingStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="unbilled">Unbilled</MenuItem>
            <MenuItem value="billed">Billed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ fromDate: f, toDate: t }) => { setFromDate(f ?? ""); setToDate(t ?? "") }}
          />
          <FilterActions
            onSearch={() => setFilters({
              clientId: clientId || undefined,
              agreementId: agreementId || undefined,
              billingStatus,
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            })}
            onClear={() => {
              setClientId("")
              setAgreementId("")
              setBillingStatus("unbilled")
              setFromDate("")
              setToDate("")
              setFilters({ billingStatus: "unbilled" })
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "auto" }}>
        {(rows as Record<string, unknown>[]).length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No {kind.toLowerCase()} rows found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {headers.map(h => (
                  <Box
                    component="th"
                    key={h || "actions"}
                    sx={{ px: 2, py: 1, textAlign: h === "Remaining" || h === "Billed" || h === "Fee" || h === "Success Fee" || h === "Amount" ? "right" : "left", fontSize: 12, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(rows as Record<string, unknown>[]).map(row => {
                const remaining = remainingOf(row)
                const canGenerate = remaining > 0 || kind === "Enforcement"
                const date = row.agreementDate ? formatDate(String(row.agreementDate)) : "—"
                return (
                  <Box component="tr" key={String(row.id ?? row.enforcementBillingId)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(row.agreementNo ?? row.id)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{date}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{clientLabel(row)}</Box>
                    {kind === "Enforcement" ? (
                      <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600, textAlign: "right" }}>
                        {formatCurrency(feeTotalOf(kind, row))}
                      </Box>
                    ) : (
                      <>
                        <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: "right" }}>
                          {formatCurrency(feeTotalOf(kind, row))}
                        </Box>
                        <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: "right" }}>
                          {formatCurrency(billedOf(kind, row))}
                        </Box>
                        <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600, textAlign: "right" }}>
                          {formatCurrency(remaining)}
                        </Box>
                        <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(row.billingType ?? "—")}</Box>
                      </>
                    )}
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(row.scope ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!canGenerate}
                        onClick={() => setSelected(row)}
                      >
                        Generate
                      </Button>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Paper>

      <FeeTypeBillDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        kind={kind}
        row={selected}
        onSuccess={() => { setSelected(null); void refetch() }}
      />
    </PageShell>
  )
}
