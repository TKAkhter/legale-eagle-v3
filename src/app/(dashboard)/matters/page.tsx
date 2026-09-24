import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Box, Button, Chip, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useQueryClient } from "@tanstack/react-query"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { PageShell } from "@/components/ui/PageShell"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { mattersApi } from "@/api/matters"
import { useAuthStore } from "@lib/store/authStore"
import { toast } from "@/lib/toast"
import { formatDate } from "@lib/utils/formatDate"
import { MatterFormDrawer } from "./_components/MatterFormDrawer"
import { NewMatterWizard } from "./_components/NewMatterWizard"
import { MatterCloseDialog } from "./_components/MatterCloseDialog"
import { MatterListFilters } from "./_components/MatterListFilters"
import type { GridParams } from "@/types/common.types"

function text(value: unknown): string {
  return value == null || value === "" ? "—" : String(value)
}

function matterRowId(row: Record<string, unknown>): string {
  return String(row.matterId ?? row.id ?? "")
}

export default function MattersPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [createLeadId, setCreateLeadId] = useState<string | undefined>()
  const [editId, setEditId] = useState<string | undefined>()
  const [closeTarget, setCloseTarget] = useState<{ id: string; title: string } | null>(null)
  const [reopenId, setReopenId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const canEdit = useAuthStore(s => s.hasPermission)("/matters")
  const qc = useQueryClient()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const fromLead = searchParams.get("leadId") ?? undefined
      setCreateLeadId(fromLead)
      setCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function confirmReopen() {
    if (!reopenId) return
    try {
      const message = await mattersApi.reopen(reopenId)
      toast.success(message)
      qc.invalidateQueries({ queryKey: ["matters", "list"] })
      navigate(`/matters/${reopenId}`)
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to reopen matter")
    }
  }

  return (
    <PageShell
      title="Matters"
      description="All active and closed legal matters"
      action={canEdit && (
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditId(undefined); setCreateLeadId(undefined); setCreateOpen(true) }}>
          New Matter
        </Button>
      )}
    >
      <DataGrid
        columns={[
          { field: "title", header: "Title", minWidth: 160, width: 180 },
          { field: "clientName", header: "Client", minWidth: 180, width: 200, renderCell: v => text(v) },
          { field: "matterSubject", header: "Matter Subject", minWidth: 180, width: 200, renderCell: v => text(v) },
          { field: "description", header: "Matter Scope", minWidth: 200, width: 240, renderCell: v => text(v) },
          { field: "practiceArea", header: "Practice Area", minWidth: 150, width: 170, renderCell: v => text(v) },
          {
            field: "billingType", header: "Billing Type", minWidth: 130, width: 140,
            renderCell: v => v ? <Chip size="small" label={String(v)} variant="outlined" /> : "—",
          },
          { field: "attorneyName", header: "Attorney", minWidth: 160, width: 180, renderCell: v => text(v) },
          {
            field: "opposingParties", header: "Opposing Party", minWidth: 180, width: 200,
            renderCell: v => {
              const names = Array.isArray(v) ? v.map(String).filter(Boolean) : []
              return names.length ? names.join(", ") : "—"
            },
          },
          { field: "status", header: "Status", minWidth: 110, width: 120, renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "closeDate", header: "Close Date", minWidth: 130, width: 140, renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "createdAt", header: "Created At", minWidth: 130, width: 140, renderCell: v => v ? formatDate(String(v)) : "—" },
        ]}
        queryKey={["matters", "list"]}
        queryFn={(p) => mattersApi.getAll(p as GridParams)}
        FilterPanel={MatterListFilters}
        hasFilters
        syncWithUrl
        defaultPageSize={10}
        isSortingBackend={false}
        detailPath={(row) => `/matters/${matterRowId(row as Record<string, unknown>)}`}
        rowExpansion={{
          render: (row) => {
            const subs = (row as Record<string, unknown>).subMatters
            const items = Array.isArray(subs) ? subs as Record<string, unknown>[] : []
            if (!items.length) return <Typography variant="body2" color="text.secondary">No sub-matters</Typography>
            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
                {items.map(item => (
                  <Typography key={String(item.id ?? item.title)} variant="body2">
                    {String(item.title ?? "Sub-matter")} · {String(item.status ?? "")} · {String(item.billingType ?? "")}
                  </Typography>
                ))}
              </Box>
            )
          },
        }}
        rowMenuItems={(row) => {
          const record = row as Record<string, unknown>
          const id = matterRowId(record)
          const status = String(record.status ?? "")
          return [
            { label: "Details", onClick: () => navigate(`/matters/${id}`) },
            ...(canEdit ? [{
              label: status === "CLOSE" ? "Reopen" : "Close",
              onClick: () => {
                if (status === "CLOSE") setReopenId(id)
                else setCloseTarget({ id, title: String(record.title ?? "") })
              },
            }] : []),
            ...(canEdit ? [{
              label: "Edit",
              onClick: () => { setEditId(String(record.id ?? id)); setCreateOpen(true) },
            }] : []),
          ]
        }}
      />

      {createOpen && !editId && (
        <NewMatterWizard
          open={createOpen}
          leadId={createLeadId}
          onClose={() => { setCreateOpen(false); setCreateLeadId(undefined) }}
        />
      )}
      {createOpen && editId && (
        <MatterFormDrawer
          open={createOpen}
          onClose={() => { setCreateOpen(false); setEditId(undefined) }}
          matterId={editId}
          onSuccess={() => { setCreateOpen(false); setEditId(undefined); qc.invalidateQueries({ queryKey: ["matters", "list"] }) }}
        />
      )}
      {closeTarget && (
        <MatterCloseDialog
          open
          matterId={closeTarget.id}
          matterTitle={closeTarget.title}
          onClose={() => setCloseTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!reopenId}
        onClose={() => setReopenId(null)}
        onConfirm={confirmReopen}
        title="Reopen Matter"
        message="Are you sure you want to reopen this matter?"
        confirmLabel="Reopen"
      />
    </PageShell>
  )
}
