import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { LeadFormDrawer } from "../leads/_components/LeadFormDrawer"
import { internalLeadsApi } from "@/api/requestMatters"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function InternalLeadsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <PageShell
      title="Internal Leads"
      description="Leads marked as internal referrals"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setFormOpen(true) }}>
          New Internal Lead
        </Button>
      }
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
            { label: "Edit", icon: <EditIcon fontSize="small" />, onClick: () => { setEditId(id); setFormOpen(true) } },
          ]
        }}
      />
      <LeadFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        leadId={editId}
        onSaved={() => {
          setFormOpen(false)
          setEditId(undefined)
          qc.invalidateQueries({ queryKey: ["leads", "internal"] })
          toast.success(editId ? "Internal lead updated" : "Internal lead created")
        }}
      />
    </PageShell>
  )
}
