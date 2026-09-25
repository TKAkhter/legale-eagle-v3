import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Chip, Divider, Typography,
  Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import VisibilityIcon from "@mui/icons-material/Visibility"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import { Link as RouterLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TransferFormDrawer } from "./_components/TransferFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

type TransferItem = { name?: string; status?: string }

function clientLabel(row: Record<string, unknown>, side: "from" | "to"): string {
  if (side === "from") {
    return String(
      row.fromClientName
      ?? row.fromObjectName
      ?? row.fromObject
      ?? "—",
    )
  }
  return String(
    row.toClientName
    ?? row.toObjectName
    ?? row.toObject
    ?? "—",
  )
}

function clientId(row: Record<string, unknown>, side: "from" | "to"): string | null {
  const id = side === "from"
    ? row.fromObjectId ?? row.fromClientId
    : row.toObjectId ?? row.toClientId
  const s = String(id ?? "").trim()
  if (!s) return null
  return s
}

function TransferDetailDialog({
  open,
  onClose,
  transfer,
}: {
  open: boolean
  onClose: () => void
  transfer: Record<string, unknown> | null
}) {
  if (!transfer) return null
  const items = (transfer.transferItemsInfo as TransferItem[] | undefined) ?? []
  const reason = String(transfer.transferReasons ?? transfer.reason ?? "")
  const fromId = clientId(transfer, "from")
  const toId = clientId(transfer, "to")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
          {fromId ? (
            <Typography
              component={RouterLink}
              to={`/clients/${fromId}`}
              variant="body1"
              sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
            >
              {clientLabel(transfer, "from")}
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{clientLabel(transfer, "from")}</Typography>
          )}
          <ArrowForwardIcon fontSize="small" color="action" />
          {toId ? (
            <Typography
              component={RouterLink}
              to={`/clients/${toId}`}
              variant="body1"
              sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
            >
              {clientLabel(transfer, "to")}
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{clientLabel(transfer, "to")}</Typography>
          )}
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
          Transfer Date: {String(transfer.transferDate ?? transfer.createdAt ?? "—")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
          Transfer By: {String(transfer.transferBy ?? "—")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Reason: {reason.trim() || "—"}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No transfer items.</Typography>
        ) : (
          items.map((item, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{item.name ?? "—"}</Typography>
              <Chip
                size="small"
                label={item.status ?? "—"}
                color={item.status === "Completed" ? "success" : "warning"}
                variant="outlined"
              />
            </Box>
          ))
        )}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">Status</Typography>
          <StatusBadge status={String(transfer.status ?? "—")} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ClientTransferPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const status = tab === 0 ? "pending" : "completed"

  // Poll pending transfers while tab is open (OLD re-fetches until Completed)
  useEffect(() => {
    if (status !== "pending") return
    const id = window.setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["transfers", "pending"] })
    }, 5000)
    return () => window.clearInterval(id)
  }, [status, qc])

  const columns = useMemo(() => [
    {
      field: "fromObject",
      header: "From Client",
      renderCell: (_v: unknown, row: unknown) => clientLabel(row as Record<string, unknown>, "from"),
    },
    {
      field: "toObject",
      header: "To Client",
      renderCell: (_v: unknown, row: unknown) => clientLabel(row as Record<string, unknown>, "to"),
    },
    {
      field: "transferBy",
      header: "Transfer By",
      renderCell: (v: unknown) => String(v || "—"),
    },
    {
      field: "transferDate",
      header: "Transfer At",
      renderCell: (v: unknown, row: unknown) =>
        String(v ?? (row as Record<string, unknown>).createdAt ?? "—"),
    },
    {
      field: "transferReasons",
      header: "Reason",
      renderCell: (v: unknown, row: unknown) => {
        const reason = String(v ?? (row as Record<string, unknown>).reason ?? "")
        if (!reason) return "—"
        return reason.length > 60 ? `${reason.slice(0, 60)}…` : reason
      },
    },
    {
      field: "status",
      header: "Status",
      renderCell: (v: unknown) => <StatusBadge status={String(v || "—")} />,
    },
  ], [])

  return (
    <PageShell
      title={t("nav.clientTransfer")}
      description={t("pages.clientTransferDesc")}
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Transfer
        </Button>
      }
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setGridKey(k => k + 1) }}>
          <Tab label="Pending" />
          <Tab label="Completed" />
        </Tabs>
      </Box>
      <DataGrid
        key={`${status}-${gridKey}`}
        columns={columns}
        queryKey={["transfers", status]}
        queryFn={(p: GridParams) => miscModulesApi.getTransfers(p, status)}
        zebraStriping
        onRowClick={row => setDetail(row as Record<string, unknown>)}
        rowMenuItems={row => [
          {
            label: "Details",
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => setDetail(row as Record<string, unknown>),
          },
        ]}
      />
      <TransferFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false)
          setTab(0)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["transfers"] })
          toast.success("Transfer created")
        }}
      />
      <TransferDetailDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        transfer={detail}
      />
    </PageShell>
  )
}
