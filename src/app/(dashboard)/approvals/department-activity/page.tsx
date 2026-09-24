/**
 * Department activity approvals — LMS secretary queue parity.
 * Matter filter, bulk approve, edit / purge / discount via timelogsApi.
 */
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
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { MatterSelectFilter } from "@/components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@/components/filters/DateRangeFilter"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { miscModulesApi } from "@/api/miscModules"
import { timelogsApi } from "@/api/timelogs"
import { PERMISSIONS } from "@config/permissions"
import type { FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"

function DeptActivityFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => setF(p => ({ ...p, matterId: v }))}
      />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
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

function activityId(row: Record<string, unknown>): string {
  return String(row.activityId ?? row.id ?? "")
}

type AdjustMode = "purge" | "discount"

export default function DepartmentActivityApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [editId, setEditId] = useState<string>()
  const [adjust, setAdjust] = useState<{ id: string; mode: AdjustMode }>()
  const [hours, setHours] = useState("0")
  const [minutes, setMinutes] = useState("0")

  async function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["approvals", "department-activity"] })
  }

  async function approveRows(rows: Record<string, unknown>[]) {
    try {
      const items = rows.map(r => ({
        activityApprovalId: approvalId(r),
        revenueStatus: "COMPLETED",
        rejectedReason: "",
      }))
      // LMS secretary queue posts array to /activity/approve
      toast.success(await timelogsApi.approve(items))
      await refresh()
    } catch {
      toast.error("Approval failed")
    }
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
      title="Department Activity Approvals"
      description="Secretary / department review of time entries — edit, purge, discount, or approve"
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "client",
            header: "Client",
            renderCell: (v, row) => clientName(v ?? (row as { clientName?: string }).clientName),
            minWidth: 140,
          },
          {
            field: "activity",
            header: "Description",
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).activityName || (row as Record<string, unknown>).note || "—"),
            minWidth: 160,
          },
          {
            field: "responsiblePerson",
            header: "Lawyer",
            renderCell: (v, row) => personName(v ?? (row as { userName?: string }).userName),
          },
          {
            field: "totalHours",
            header: "Hours",
            align: "right",
            renderCell: (v, row) => Number(v ?? (row as { hours?: number }).hours ?? 0).toFixed(2),
          },
          {
            field: "billing",
            header: "Amount",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "entryDate",
            header: "Entry Date",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "matter",
            header: "Matter",
            renderCell: (v, row) => {
              if (typeof v === "object" && v) return String((v as { title?: string }).title ?? "—")
              return String((row as { matterTitle?: string }).matterTitle ?? v ?? "—")
            },
          },
          {
            field: "revenueStatus",
            header: "Status",
            renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { status?: string }).status ?? "Pending")} />,
          },
        ]}
        queryKey={["approvals", "department-activity"]}
        queryFn={(p: GridParams) => miscModulesApi.getDepartmentActivityApprovals(p)}
        FilterPanel={DeptActivityFilter}
        hasFilters
        hasRowSelection
        zebraStriping
        defaultSortBy="entryDate"
        defaultSortDir="desc"
        bulkActions={[
          {
            label: "Approve selected",
            icon: <CheckIcon fontSize="small" />,
            onClick: rows => void approveRows(rows as Record<string, unknown>[]),
          },
        ]}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = activityId(r)
          return [
            {
              label: "Approve",
              icon: <CheckIcon fontSize="small" />,
              permission: PERMISSIONS.TIMELOGS_APPROVE,
              onClick: () => void approveRows([r]),
            },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => setEditId(id),
            },
            {
              label: "Purge",
              icon: <ContentCutIcon fontSize="small" />,
              onClick: () => { setAdjust({ id, mode: "purge" }); setHours("0"); setMinutes("0") },
            },
            {
              label: "Discount",
              icon: <PercentIcon fontSize="small" />,
              onClick: () => { setAdjust({ id, mode: "discount" }); setHours("0"); setMinutes("0") },
            },
          ]
        }}
      />

      <ActivityFormDrawer
        open={!!editId}
        onClose={() => setEditId(undefined)}
        activityId={editId}
        onSuccess={() => { setEditId(undefined); void refresh() }}
      />

      <Dialog open={!!adjust} onClose={() => setAdjust(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>{adjust?.mode === "purge" ? "Purge Hours" : "Discount Hours"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField size="small" label="Hours" type="number" value={hours} onChange={e => setHours(e.target.value)} />
          <TextField size="small" label="Minutes" type="number" value={minutes} onChange={e => setMinutes(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjust(undefined)}>Cancel</Button>
          <Button variant="contained" onClick={() => { void submitAdjust() }}>Apply</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
