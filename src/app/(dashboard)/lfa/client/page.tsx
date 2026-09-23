import { useTranslation } from "react-i18next"
import { Box, Button, Chip } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { lfaApi } from "@/api/lfa"
import { useState } from "react"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

function LfaClientFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [clientId, setClientId] = useState(String(filters.clientId ?? ""))
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
      <ClientSelectFilter value={clientId || undefined} onChange={v => setClientId(v ?? "")} />
      <Button size="small" variant="contained" onClick={() => onSearch({ clientId })}>Fetch</Button>
      <Button size="small" onClick={() => { setClientId(""); onReset() }}>Reset</Button>
    </Box>
  )
}

export default function ClientLfasPage() {
  const { t } = useTranslation()
  return (
    <PageShell
      title={t("nav.lfa-client", "Client Fee Agreements")}
      description={t("lfa.clientDesc", "Fee agreements by client")}
    >
      <DataGrid
        columns={[
          { field: "agreementNo", header: "Agreement No.", sortKey: "agreementNo", minWidth: 140 },
          {
            field: "client",
            header: "Client",
            renderCell: v => {
              const c = v as Record<string, string> | null
              return c?.companyName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "—"
            },
          },
          { field: "billingType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
          {
            field: "fixedBillingAmount",
            header: "Amount",
            align: "right",
            renderCell: v => v != null ? formatCurrency(Number(v)) : "—",
          },
          { field: "startDate", header: "Start Date", renderCell: (v, row) => {
            const r = row as Record<string, unknown>
            const d = v ?? r.agreementDate ?? r.applicableDate
            return d ? formatDate(String(d)) : "—"
          }},
          { field: "endDate", header: "End Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "current", header: "Status", renderCell: v => <StatusBadge status={v ? "Active" : "Inactive"} /> },
          { field: "lfaStatus", header: "LFA Status", renderCell: v => <StatusBadge status={String(v ?? "—")} /> },
          { field: "signatureStatus", header: "Signature", renderCell: v => <StatusBadge status={String(v ?? "Not Sent")} /> },
        ]}
        queryKey={["lfa", "client"]}
        queryFn={async (params: GridParams) => {
          const clientId = String(params.filters?.clientId ?? "")
          return lfaApi.getByClient(clientId, params)
        }}
        FilterPanel={LfaClientFilter}
        hasFilters
        detailPath={row => `/lfa/${String((row as { id?: string }).id ?? "")}`}
        defaultSortBy="agreementNo"
      />
    </PageShell>
  )
}
