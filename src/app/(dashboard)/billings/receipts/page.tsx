import { useState } from "react"
import { Box, Button, Chip, Paper, Typography, LinearProgress } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"

export default function ReceiptsPage() {
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: ["billings", "receipts", filters],
    queryFn: () => billingApi.getReceipts(filters),
  })

  return (
    <PageShell
      title="Receipts"
      description="Collection receipts linked to invoices"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Receipts" }]}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <MatterSelectFilter value={matterId} onChange={v => setMatterId(v ?? "")} />
          <FilterActions
            onSearch={() => setFilters({ clientId: clientId || undefined, matterId: matterId || undefined })}
            onClear={() => { setClientId(""); setMatterId(""); setFilters({}) }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {(rows as Record<string, unknown>[]).length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No receipts found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Receipt #", "Client", "Date", "Amount", "Status"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(rows as Record<string, unknown>[]).map(r => (
                <Box component="tr" key={String(r.id)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.receiptNo ?? r.id)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.clientName ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{formatDate(String(r.receiptDate ?? ""))}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600 }}>{formatCurrency(Number(r.amount ?? 0))}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={String(r.status ?? "Active")} variant="outlined" />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </PageShell>
  )
}
