import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
} from "@mui/material"
import CheckIcon from "@mui/icons-material/Check"
import EditIcon from "@mui/icons-material/Edit"
import ContentCutIcon from "@mui/icons-material/ContentCut"
import PercentIcon from "@mui/icons-material/Percent"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import { PERMISSIONS } from "@config/permissions"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"

function ApprovalFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <MatterSelectFilter value={String(f.matterId ?? "") || undefined} onChange={v => setF(p => ({ ...p, matterId: v }))} />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

function personName(v: unknown): string {
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function clientName(v: unknown): string {
  const c = v as Record<string, string> | null
  return c?.companyName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "—"
}

function approvalId(row: Record<string, unknown>): string {
  return String(row.activityApprovalId ?? row.id ?? "")
}

type AdjustMode = "purge" | "discount"

export default function TimelogsApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [editId, setEditId] = useState<string>()
  const [adjust, setAdjust] = useState<{ id: string; mode: AdjustMode }>()
  const [hours, setHours] = useState("0")
  const [minutes, setMinutes] = useState("0")

  async function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["timelogs"] })
  }

  async function approveRows(rows: Record<string, unknown>[]) {
    const items = rows.map(r => ({
      activityApprovalId: approvalId(r),
      revenueStatus: "COMPLETED",
      rejectedReason: "",
    }))
    toast.success(await timelogsApi.approveByApprovals(items))
    await refresh()
  }

  async function submitAdjust() {
    if (!adjust) return
    const h = Number(hours) || 0
    const m = Number(minutes) || 0
    const body = { hours: h, minutes: m, billedHours: h, billedMinutes: m }
    try {
      if (adjust.mode === "purge") toast.success(await timelogsApi.purge(adjust.id, body))
      else toast.success(await timelogsApi.discount(adjust.id, body))
      setAdjust(undefined)
      setHours("0")
      setMinutes("0")
      await refresh()
    } catch {
      toast.error("Adjustment failed")
    }
  }

  return (
    <PageShell
      title="Timelogs Approval"
      description="Attorney approval of time entries — edit, purge, discount, or approve"
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "client", header: "Client", renderCell: v => clientName(v), minWidth: 140 },
          { field: "activity", header: "Description", renderCell: (v, row) => String(v || (row as Record<string, unknown>).note || "—"), minWidth: 160 },
          { field: "responsiblePerson", header: "Lawyer", renderCell: v => personName(v) },
          { field: "totalHours", header: "Hours", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "purgedHours", header: "Purged Hrs", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "discountedHours", header: "Discount Hrs", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "entryDate", header: "Entry Date", renderCell: v => formatDate(String(v ?? "")) },
          { field: "matter", header: "Matter", renderCell: v => (v as Record<string, string>)?.title ?? "—" },
          { field: "agreementNo", header: "Agreement No.", renderCell: v => String(v || "—") },
          { field: "lfaBillingType", header: "LFA Type", renderCell: v => <StatusBadge status={String(v || "—")} /> },
          { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["timelogs", "approval"]}
        queryFn={(p: GridParams) => timelogsApi.getForApprovalByUser(p)}
        FilterPanel={ApprovalFilter}
        hasFilters
        syncWithUrl
        hasRowSelection
        defaultSortBy="entryDate"
        defaultSortDir="desc"
        bulkActions={[{
          label: "Approve Selected",
          icon: <CheckIcon fontSize="small" />,
          onClick: async (rows) => {
            try {
              await approveRows(rows as Record<string, unknown>[])
            } catch {
              toast.error("Bulk approval failed")
            }
          },
        }]}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          return [
            {
              label: "Approve",
              icon: <CheckIcon fontSize="small" />,
              permission: PERMISSIONS.TIMELOGS_APPROVE,
              onClick: async () => {
                try {
                  await approveRows([r])
                } catch {
                  toast.error("Approve failed")
                }
              },
            },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => setEditId(id),
            },
            {
              label: "Purge Hours",
              icon: <ContentCutIcon fontSize="small" />,
              onClick: () => { setAdjust({ id, mode: "purge" }); setHours("0"); setMinutes("0") },
            },
            {
              label: "Discount Hours",
              icon: <PercentIcon fontSize="small" />,
              onClick: () => { setAdjust({ id, mode: "discount" }); setHours("0"); setMinutes("0") },
            },
          ]
        }}
      />

      <ActivityFormDrawer
        open={!!editId}
        activityId={editId}
        onClose={() => setEditId(undefined)}
        onSuccess={() => { setEditId(undefined); refresh() }}
      />

      <Dialog open={!!adjust} onClose={() => setAdjust(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>{adjust?.mode === "purge" ? "Purge Hours" : "Discount Hours"}</DialogTitle>
        <DialogContent sx={{ display: "flex", gap: 1.5, pt: 2 }}>
          <TextField
            label="Hours"
            type="number"
            size="small"
            value={hours}
            onChange={e => setHours(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label="Minutes"
            type="number"
            size="small"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: 0, max: 59 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjust(undefined)}>Cancel</Button>
          <Button variant="contained" onClick={submitAdjust}>Apply</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
