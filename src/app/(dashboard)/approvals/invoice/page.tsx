/**
 * Invoice approvals — LMS Pending / Completed tabs.
 */
import { useState } from "react"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs, TextField } from "@mui/material"
import VisibilityIcon from "@mui/icons-material/Visibility"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { InvoiceApprovalReviewDialog } from "./_components/InvoiceApprovalReviewDialog"
import { axiosClient } from "@lib/api/axios"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams, PageResponse } from "@/types/common.types"
import { env } from "@/config/env"
import { invoiceApprovals as staticInvoiceApprovals } from "@/data/static"

type TabKey = "Pending" | "Completed"

function clientLabel(v: unknown): string {
  const c = v as Record<string, string> | null
  if (!c) return "—"
  return c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
}

function CompletedFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter value={String(f.clientId ?? "") || undefined} onChange={v => setF(p => ({ ...p, clientId: v }))} />
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

async function fetchPending(_params: GridParams): Promise<PageResponse<Record<string, unknown>>> {
  if (env.USE_STATIC_DATA) {
    const list = staticInvoiceApprovals as unknown as Record<string, unknown>[]
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const res = await axiosClient.get("/api/invoice/ap/get/user")
  const list = res.data?.data ?? res.data ?? []
  const arr = (Array.isArray(list) ? list : []) as Record<string, unknown>[]
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

async function fetchCompleted(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
  if (env.USE_STATIC_DATA) {
    const list = (staticInvoiceApprovals as unknown as Record<string, unknown>[]).map(r => ({
      ...r,
      invoiceStatus: "Completed",
    }))
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const f = p.filters ?? {}
  const res = await axiosClient.get("/api/invoice/ap/my/completed", {
    params: {
      invoiceIssuedFromDate: f.fromDate ?? "",
      invoiceIssuedToDate: f.toDate ?? "",
      clientId: f.clientId ?? "",
      pageNumber: p.page,
      pageSize: p.pageSize,
    },
  })
  const d = res.data?.data ?? res.data ?? {}
  const content = (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
  return {
    content,
    totalElements: Number(d.totalElements ?? content.length),
    totalPages: Number(d.totalPages ?? 1),
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: true,
    empty: content.length === 0,
  }
}

export default function InvoiceApprovalPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>("Pending")
  const [gridKey, setGridKey] = useState(0)
  const [reviewRow, setReviewRow] = useState<Record<string, unknown> | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  async function handleApprove(row: Record<string, unknown>, approve: boolean, reason = "") {
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post(
          "/api/invoice/ap/approve/single",
          { status: approve ? "Completed" : "Rejected", rejectedReason: approve ? "" : (reason || "Rejected") },
          { params: { invoiceApprovalsId: row.id } },
        )
      }
      toast.success(approve ? "Invoice approved" : "Invoice rejected")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["invoices", "approval"] })
    } catch {
      toast.error("Action failed")
    }
  }

  return (
    <PageShell title="Invoice Approvals" description="Invoices pending your approval">
      <Tabs value={tab} onChange={(_, v: TabKey) => { setTab(v); setGridKey(k => k + 1) }} sx={{ mb: 2 }}>
        <Tab label="Pending" value="Pending" />
        <Tab label="Completed" value="Completed" />
      </Tabs>

      <DataGrid
        key={`${tab}-${gridKey}`}
        columns={[
          {
            field: "invoiceNo",
            header: "Invoice #",
            renderCell: (v, row) => String(v ?? (row as { taxInvoiceNo?: string }).taxInvoiceNo ?? "—"),
          },
          {
            field: "client",
            header: "Client",
            renderCell: (v, row) => clientLabel(v ?? (row as { clients?: unknown }).clients),
            minWidth: 140,
          },
          {
            field: "matterTitle",
            header: "Matter",
            renderCell: (v, row) => {
              const m = (row as { matter?: { title?: string } }).matter
              return String(v ?? m?.title ?? "—")
            },
          },
          {
            field: "billingType",
            header: "Billing Type",
            renderCell: (v, row) => String(v ?? (row as { invoiceBillingType?: string }).invoiceBillingType ?? "—"),
          },
          {
            field: "agreementNo",
            header: "LFA",
            renderCell: (v, row) => String(v ?? (row as { lfaNo?: string }).lfaNo ?? "—"),
          },
          {
            field: "taxableAmount",
            header: "Amount",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "issueDate",
            header: "Issued",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "dueDate",
            header: "Due",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "status",
            header: "Status",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const raw = String(r.status ?? r.invoiceStatus ?? (tab === "Completed" ? "Completed" : "Approval"))
              const label = raw === "Completed" ? "Approved" : raw
              return <StatusBadge status={label} />
            },
          },
        ]}
        queryKey={["invoices", "approval", tab]}
        queryFn={tab === "Pending" ? fetchPending : fetchCompleted}
        FilterPanel={tab === "Completed" ? CompletedFilter : undefined}
        hasFilters={tab === "Completed"}
        isPaginated={tab === "Completed"}
        zebraStriping
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          if (tab === "Completed") {
            return [
              { label: "View", icon: <VisibilityIcon fontSize="small" />, onClick: () => setReviewRow(r) },
            ]
          }
          return [
            { label: "Review", icon: <VisibilityIcon fontSize="small" />, onClick: () => setReviewRow(r) },
            { label: "Approve", icon: <CheckIcon fontSize="small" />, onClick: () => void handleApprove(r, true) },
            {
              label: "Reject",
              icon: <CloseIcon fontSize="small" />,
              color: "error",
              onClick: () => { setRejectId(String(r.id ?? "")); setRejectReason("") },
            },
          ]
        }}
      />

      <InvoiceApprovalReviewDialog
        open={!!reviewRow}
        onClose={() => setReviewRow(null)}
        approval={reviewRow}
        onDone={() => {
          setReviewRow(null)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["invoices", "approval"] })
        }}
      />

      <Dialog open={!!rejectId} onClose={() => setRejectId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Invoice</DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={3}
            label="Rejection reason"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
            onClick={() => {
              void handleApprove({ id: rejectId }, false, rejectReason)
              setRejectId(null)
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
