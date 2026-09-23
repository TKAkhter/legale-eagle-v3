import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { internalLeadsApi } from "@/api/requestMatters"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

export default function InternalLeadsPage() {
  const navigate = useNavigate()

  return (
    <PageShell
      title="Internal Leads"
      description="Leads marked as internal referrals"
    >
      <DataGrid
        columns={[
          {
            field: "name",
            header: "Lead",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).companyName
              || `${(row as Record<string, string>).firstName ?? ""} ${(row as Record<string, string>).lastName ?? ""}`.trim()
              || "—",
            ),
          },
          {
            field: "leadType",
            header: "Type",
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).type || "—"),
          },
          {
            field: "status",
            header: "Status",
            renderCell: v => <StatusBadge status={String(v ?? "Internal")} />,
          },
          {
            field: "createdAt",
            header: "Created",
            renderCell: v => formatDate(String(v ?? "")),
          },
        ]}
        queryKey={["leads", "internal"]}
        queryFn={(p: GridParams) => internalLeadsApi.getAll(p)}
        zebraStriping
        detailPath={(row) => `/leads/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={(row) => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            { label: "Details", onClick: () => navigate(`/leads/${id}`) },
          ]
        }}
      />
    </PageShell>
  )
}
