import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ConvertRequestDrawer } from "./_components/ConvertRequestDrawer"
import { RequestMatterFormDrawer } from "./_components/RequestMatterFormDrawer"
import { requestMattersApi } from "@/api/requestMatters"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function RequestMattersPage() {
  const qc = useQueryClient()
  const [convertRow, setConvertRow] = useState<Record<string, unknown> | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <PageShell
      title="Request Matters"
      description="Incoming matter requests awaiting conversion"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setFormOpen(true) }}>
          New Request
        </Button>
      }
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
        rowMenuItems={(row) => [
          {
            label: "Edit",
            icon: <EditIcon fontSize="small" />,
            onClick: () => {
              setEditId(String((row as { id?: string }).id ?? ""))
              setFormOpen(true)
            },
          },
          {
            label: "Convert to Matter",
            icon: <SwapHorizIcon fontSize="small" />,
            onClick: () => setConvertRow(row as Record<string, unknown>),
          },
        ]}
      />
      <RequestMatterFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        requestId={editId}
        onSuccess={() => {
          setFormOpen(false)
          setEditId(undefined)
          qc.invalidateQueries({ queryKey: ["matters", "request"] })
          toast.success(editId ? "Request updated" : "Request created")
        }}
      />
      <ConvertRequestDrawer
        open={!!convertRow}
        onClose={() => setConvertRow(null)}
        request={convertRow}
        onSuccess={() => {
          setConvertRow(null)
          qc.invalidateQueries({ queryKey: ["matters", "request"] })
        }}
      />
    </PageShell>
  )
}
