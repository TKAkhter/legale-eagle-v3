import { useState } from "react"
import { Box, Button, MenuItem, Paper, TextField, Typography, LinearProgress } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi, type FeeBillKind } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { FeeTypeBillDrawer } from "../_components/FeeTypeBillDrawer"

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

function amountFor(kind: FeeBillKind, row: Record<string, unknown>) {
  if (kind === "Contingent") return Number(row.contingent ?? 0) - Number(row.billedAmount ?? 0)
  if (kind === "NonContingent") return Number(row.nonContingent ?? 0)
  if (kind === "SuccessRate") return Number(row.finalFixedFees ?? 0) - Number(row.successRateBilledAmount ?? 0)
  return Number(row.enforcementAmount ?? 0)
}

export function FeeTypeBillingPage({ kind }: { kind: FeeBillKind }) {
  const [clientId, setClientId] = useState("")
  const [billingStatus, setBillingStatus] = useState("unbilled")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({ billingStatus: "unbilled" })
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "fee-type", kind, filters],
    queryFn: () => billingApi.getFeeTypeRows(kind, filters),
  })

  return (
    <PageShell
      title={TITLES[kind]}
      description={`Generate ${kind} invoices from LFA fee schedules`}
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: TITLES[kind] }]}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <TextField
            select size="small" label="Status" value={billingStatus}
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
              billingStatus,
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            })}
            onClear={() => {
              setClientId("")
              setBillingStatus("unbilled")
              setFromDate("")
              setToDate("")
              setFilters({ billingStatus: "unbilled" })
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {(rows as Record<string, unknown>[]).length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No {kind.toLowerCase()} rows found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Agreement", "Client", "Amount", ""].map(h => (
                  <Box component="th" key={h || "a"} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(rows as Record<string, unknown>[]).map(row => (
                <Box component="tr" key={String(row.id)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(row.agreementNo ?? row.id)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{clientLabel(row)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600 }}>{formatCurrency(amountFor(kind, row))}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Button size="small" variant="contained" onClick={() => setSelected(row)}>Generate</Button>
                  </Box>
                </Box>
              ))}
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
