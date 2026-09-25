import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import UpdateIcon from "@mui/icons-material/Update"
import EventNoteIcon from "@mui/icons-material/EventNote"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { LeadFormDrawer } from "../leads/_components/LeadFormDrawer"
import { LeadStatusDialog } from "../leads/_components/LeadStatusDialog"
import { FollowupFormDrawer } from "../leads/_components/FollowupFormDrawer"
import { internalLeadsApi } from "@/api/requestMatters"
import { leadsApi } from "@/api/leads"
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
  const [statusLead, setStatusLead] = useState<{ id: string; status?: string } | null>(null)
  const [followUpLeadId, setFollowUpLeadId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["leads", "statuses"],
    queryFn: () => leadsApi.getLeadStatuses(),
  })

  const statusChoices = useMemo(() => (
    statusOptions.length ? statusOptions : ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
  ), [statusOptions])

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
        key={gridKey}
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
            renderCell: (v, row) => (
              <StatusBadge status={String(v ?? (row as Record<string, unknown>).currentStatus ?? "Internal")} />
            ),
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
          const r = row as { id?: string; status?: string; currentStatus?: string; writeOff?: boolean; converted?: boolean }
          const id = String(r.id ?? "")
          const status = String(r.status ?? r.currentStatus ?? "")
          const writtenOff = !!r.writeOff || ["WRITE_OFF", "Writeoff"].includes(status)
          const converted = !!r.converted || status === "CONVERTED" || status === "Converted"
          const active = !writtenOff && !converted
          return [
            { label: "Details", onClick: () => navigate(`/leads/${id}`) },
            { label: "Edit", icon: <EditIcon fontSize="small" />, onClick: () => { setEditId(id); setFormOpen(true) } },
            ...(active ? [{
              label: "Update Status",
              icon: <UpdateIcon fontSize="small" />,
              onClick: () => setStatusLead({ id, status }),
            }] : []),
            ...(active ? [{
              label: "Follow Up",
              icon: <EventNoteIcon fontSize="small" />,
              onClick: () => setFollowUpLeadId(id),
            }] : []),
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
          setGridKey(k => k + 1)
          toast.success(editId ? "Internal lead updated" : "Internal lead created")
        }}
      />
      <LeadStatusDialog
        open={!!statusLead}
        onClose={() => setStatusLead(null)}
        leadId={statusLead?.id ?? ""}
        statuses={statusChoices}
        initialStatus={statusLead?.status}
        onSuccess={() => {
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["leads", "internal"] })
          toast.success("Status updated")
        }}
      />
      <FollowupFormDrawer
        open={!!followUpLeadId}
        onClose={() => setFollowUpLeadId(undefined)}
        leadId={followUpLeadId ?? ""}
        onSuccess={() => {
          setFollowUpLeadId(undefined)
          setGridKey(k => k + 1)
          toast.success("Follow-up added")
        }}
      />
    </PageShell>
  )
}
