import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import MoneyOffIcon from "@mui/icons-material/MoneyOff"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { WriteOffDialog } from "../../leads/_components/WriteOffDialog"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showDateRange: true })

export default function PendingMattersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [writeOffId, setWriteOffId] = useState<string | null>(null)

  return (
    <PageShell title="Pending Matters" description="Leads awaiting matter creation">
      <DataGrid
        columns={[
          { field: "name", header: "Lead", renderCell: (v, row) => String(v ?? (row as { companyName?: string }).companyName ?? "—") },
          { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
          { field: "status", header: "Stage", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "leadSource", header: "Source", renderCell: v => String(v || "—") },
          { field: "practiceArea", header: "Practice Area", renderCell: v => typeof v === "object" && v ? String((v as { name?: string }).name ?? "") : String(v ?? "—") },
          { field: "createdAt", header: "Created", renderCell: v => v ? formatDate(String(v)) : "—" },
        ]}
        queryKey={["matters", "pending"]}
        queryFn={(p: GridParams) => miscModulesApi.getPendingMatters(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        detailPath={row => `/leads/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            { label: "Create Matter", icon: <AddIcon fontSize="small" />, onClick: () => navigate(`/matters?new=1&leadId=${id}`) },
            { label: "Open Lead", onClick: () => navigate(`/leads/${id}`) },
            { label: "Write Off", icon: <MoneyOffIcon fontSize="small" />, onClick: () => setWriteOffId(id) },
          ]
        }}
      />
      <WriteOffDialog
        open={!!writeOffId}
        onClose={() => setWriteOffId(null)}
        leadId={writeOffId ?? ""}
        onSuccess={() => {
          setWriteOffId(null)
          qc.invalidateQueries({ queryKey: ["matters", "pending"] })
          toast.success("Lead written off")
        }}
      />
    </PageShell>
  )
}
