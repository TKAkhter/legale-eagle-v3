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

function primaryPhone(row: Record<string, unknown>): string {
  const phones = row.phones as { phoneNo?: string; primary?: boolean }[] | undefined
  if (Array.isArray(phones) && phones.length) {
    const p = phones.find(x => x.primary) ?? phones[0]
    return String(p.phoneNo ?? "—")
  }
  return String(row.phone ?? "—")
}

function primaryEmail(row: Record<string, unknown>): string {
  const emails = (row.email ?? row.emails) as { emailId?: string }[] | string | undefined
  if (Array.isArray(emails) && emails.length) {
    return String(emails[0]?.emailId ?? "—")
  }
  if (typeof emails === "string" && emails) return emails
  return "—"
}

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
            field: "leadType",
            header: "Type",
            width: 110,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).type || "—"),
          },
          {
            field: "name",
            header: "Name",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).companyName
              || `${(row as Record<string, string>).firstName ?? ""} ${(row as Record<string, string>).lastName ?? ""}`.trim()
              || "—",
            ),
          },
          {
            field: "phones",
            header: "Phone",
            width: 150,
            renderCell: (_v, row) => primaryPhone(row as Record<string, unknown>),
          },
          {
            field: "email",
            header: "Email",
            renderCell: (_v, row) => primaryEmail(row as Record<string, unknown>),
          },
          {
            field: "status",
            header: "Status",
            width: 120,
            renderCell: v => <StatusBadge status={String(v ?? "Internal")} />,
          },
          {
            field: "conflictCheckStatus",
            header: "Conflict",
            width: 140,
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).conflictStatus
              || "—",
            ),
          },
          {
            field: "createdAt",
            header: "Created",
            width: 120,
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
        internal
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
