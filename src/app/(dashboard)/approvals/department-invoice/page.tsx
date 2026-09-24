import { useState } from "react"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { InvoiceApprovalReviewDialog } from "../invoice/_components/InvoiceApprovalReviewDialog"
import { axiosClient } from "@lib/api/axios"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { miscModulesApi } from "@/api/miscModules"
import type { GridParams } from "@/types/common.types"

export default function DepartmentInvoiceApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [reviewRow, setReviewRow] = useState<Record<string, unknown> | null>(null)

  async function handleApprove(row: Record<string, unknown>, approve: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post(
          "/api/invoice/ap/approve/single",
          { status: approve ? "Completed" : "Rejected", rejectedReason: approve ? "" : "Rejected" },
          { params: { invoiceApprovalsId: row.id } },
        )
      }
      toast.success(approve ? "Invoice approved" : "Invoice rejected")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["approvals", "department-invoice"] })
    } catch {
      toast.error("Action failed")
    }
  }

  return (
    <PageShell title="Department Invoice Approvals" description="Invoices pending department approval">
      <DataGrid
        key={gridKey}
        columns={[
          { field: "invoiceNo", header: "Invoice #", renderCell: (v, row) => String(v ?? (row as { invoice?: { invoiceNo?: string } }).invoice?.invoiceNo ?? "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => {
            const inv = (row as { invoice?: { client?: { companyName?: string } } }).invoice
            return String(v ?? inv?.client?.companyName ?? "—")
          } },
          { field: "taxableAmount", header: "Amount", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { invoice?: { taxableAmount?: number } }).invoice?.taxableAmount ?? 0)) },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "Pending")} /> },
        ]}
        queryKey={["approvals", "department-invoice"]}
        queryFn={(p: GridParams) => miscModulesApi.getDepartmentInvoiceApprovals(p)}
        isPaginated={false}
        rowMenuItems={row => [
          { label: "Review", icon: <VisibilityIcon fontSize="small" />, onClick: () => setReviewRow(row as Record<string, unknown>) },
          { label: "Approve", icon: <CheckIcon fontSize="small" />, onClick: () => handleApprove(row, true) },
          { label: "Reject", icon: <CloseIcon fontSize="small" />, color: "error", onClick: () => handleApprove(row, false) },
        ]}
      />
      <InvoiceApprovalReviewDialog
        open={!!reviewRow}
        onClose={() => setReviewRow(null)}
        approval={reviewRow}
        onDone={() => {
          setReviewRow(null)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["approvals", "department-invoice"] })
        }}
      />
    </PageShell>
  )
}
