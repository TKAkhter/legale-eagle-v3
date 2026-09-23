import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { requestMattersApi } from "@/api/requestMatters"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

export default function RequestMattersPage() {
  const navigate = useNavigate()

  return (
    <PageShell
      title="Request Matters"
      description="Incoming matter requests awaiting conversion"
    >
      <DataGrid
        columns={[
          { field: "title", header: "Title" },
          {
            field: "client",
            header: "Client",
            renderCell: (v) => {
              const c = v as Record<string, string> | null
              if (!c) return "—"
              return c.clientType === "PERSON"
                ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
                : String(c.companyName ?? "—")
            },
          },
          {
            field: "responsibleAttorney",
            header: "Attorney",
            renderCell: (v) => {
              const u = v as { firstName?: string; lastName?: string } | null
              return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
            },
          },
          { field: "practiceArea", header: "Practice Area", renderCell: v => String(v || "—") },
          { field: "billingType", header: "Billing Type", renderCell: v => String(v || "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "createdAt", header: "Created", renderCell: v => formatDate(String(v ?? "")) },
        ]}
        queryKey={["matters", "request"]}
        queryFn={(p: GridParams) => requestMattersApi.getAll(p)}
        zebraStriping
        detailPath={(row) => `/matters/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={(row) => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            { label: "Open as matter", onClick: () => navigate(`/matters/${id}`) },
          ]
        }}
      />
    </PageShell>
  )
}
