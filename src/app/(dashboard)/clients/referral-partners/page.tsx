import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { miscModulesApi } from "@/api/miscModules"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams } from "@/types/common.types"

export default function ReferralPartnersPage() {
  return (
    <PageShell title="Referral Partners" description="Your LFA referral commissions and partners">
      <DataGrid
        columns={[
          { field: "referralName", header: "Partner", renderCell: (v, row) => String(v ?? (row as { referralParty?: string }).referralParty ?? "—") },
          { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
          { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
          { field: "amount", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "status", header: "Status", renderCell: v => String(v || "—") },
        ]}
        queryKey={["referral-partners"]}
        queryFn={(p: GridParams) => miscModulesApi.getReferralPartners(p)}
        zebraStriping
      />
    </PageShell>
  )
}
