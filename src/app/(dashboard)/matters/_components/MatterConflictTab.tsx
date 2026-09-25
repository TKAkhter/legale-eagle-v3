import { useState } from "react"
import { Box, Button, Typography } from "@mui/material"
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined"
import DoneAllIcon from "@mui/icons-material/DoneAll"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

interface Props {
  matterId: string
  canEdit?: boolean
}

type ConflictRow = Record<string, unknown>

export function MatterConflictTab({ matterId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [approveAllOpen, setApproveAllOpen] = useState(false)

  const detailQuery = useQuery({
    queryKey: ["matters", "conflict", matterId, "detail"],
    queryFn: () => mattersApi.getConflictCheckDetail(matterId),
  })

  const mainConflictId = detailQuery.data?.mainConflictId ?? ""
  const overallStatus = detailQuery.data?.overallStatus ?? ""
  const pendingCount = (detailQuery.data?.logs ?? []).filter(r => r.approvedStatus !== true).length

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["matters", "conflict", matterId] }),
      qc.invalidateQueries({ queryKey: ["matters", "conflict", matterId, "detail"] }),
    ])
  }

  async function approveIds(ids: string[], label = "approved") {
    if (!mainConflictId) {
      toast.error("Unable to approve: Missing conflict ID")
      return
    }
    const pending = ids.filter(Boolean)
    if (!pending.length) return
    setBusy(true)
    try {
      toast.success(await mattersApi.approveConflict(mainConflictId, pending))
      await invalidate()
    } catch (e) {
      toast.error((e as Error)?.message ?? `Failed to ${label} conflict`)
    } finally {
      setBusy(false)
    }
  }

  async function approveAll() {
    if (!mainConflictId) {
      toast.error("Unable to approve: Missing conflict ID")
      return
    }
    setBusy(true)
    try {
      toast.success(await mattersApi.approveAllConflicts(mainConflictId))
      setApproveAllOpen(false)
      await invalidate()
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to approve all conflicts")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {overallStatus ? `Overall status: ${overallStatus}` : "Conflict matches for this matter"}
          {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
        </Typography>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DoneAllIcon />}
            disabled={busy || !mainConflictId || pendingCount === 0}
            onClick={() => setApproveAllOpen(true)}
          >
            Approve All
          </Button>
        )}
      </Box>

      <DataGrid
        columns={[
          { field: "partyName", header: "Party", renderCell: (v, row) => String(v ?? (row as ConflictRow).name ?? "—") },
          { field: "matchType", header: "Match Type", renderCell: v => String(v || "—") },
          {
            field: "status",
            header: "Status",
            renderCell: (v, row) => {
              const r = row as ConflictRow
              const label = r.approvedStatus === true ? "Cleared" : String(v ?? "Pending")
              return <StatusBadge status={label} />
            },
          },
          { field: "details", header: "Details", renderCell: v => String(v || "—") },
          {
            field: "approvedByName",
            header: "Cleared By",
            renderCell: (v, row) => {
              const r = row as ConflictRow
              if (r.approvedStatus !== true) return "—"
              return String(v || "—")
            },
          },
          {
            field: "approvedAt",
            header: "Cleared At",
            renderCell: (v, row) => {
              const r = row as ConflictRow
              if (r.approvedStatus !== true || !v) return "—"
              return formatDate(String(v))
            },
          },
        ]}
        queryKey={["matters", "conflict", matterId]}
        queryFn={(p: GridParams) => mattersApi.getConflictChecks(matterId, p)}
        zebraStriping
        hasRowSelection={canEdit}
        bulkActions={canEdit ? [
          {
            label: "Approve",
            icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
            onClick: (selected) => {
              const ids = selected
                .filter(r => (r as ConflictRow).approvedStatus !== true)
                .map(r => String((r as ConflictRow).id ?? ""))
              void approveIds(ids)
            },
          },
          {
            label: "Clear",
            icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
            onClick: (selected) => {
              const ids = selected
                .filter(r => (r as ConflictRow).approvedStatus !== true)
                .map(r => String((r as ConflictRow).id ?? ""))
              void approveIds(ids, "clear")
            },
          },
        ] : undefined}
        rowMenuItems={canEdit ? (row) => {
          const r = row as ConflictRow
          const approved = r.approvedStatus === true
          const logId = String(r.id ?? "")
          return [
            {
              label: "Approve",
              hidden: () => approved || !logId,
              onClick: () => { void approveIds([logId]) },
            },
            {
              label: "Clear",
              hidden: () => approved || !logId,
              onClick: () => { void approveIds([logId], "clear") },
            },
          ]
        } : undefined}
      />

      <ConfirmDialog
        open={approveAllOpen}
        onClose={() => setApproveAllOpen(false)}
        onConfirm={() => { void approveAll() }}
        title="Approve all conflicts"
        message="Approve and clear all pending conflict matches for this matter?"
        confirmLabel="Approve All"
        severity="warning"
      />
    </Box>
  )
}
