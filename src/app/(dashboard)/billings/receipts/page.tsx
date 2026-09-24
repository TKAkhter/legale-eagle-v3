import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as MuiLink } from "@mui/material"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true, showMatter: true })

/** LMS `/receipts` — collection receipts list with cancel (create/pay live on invoice payment). */
export default function ReceiptsPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [cancelId, setCancelId] = useState<string | null>(null)

  return (
    <PageShell
      title="Receipts"
      description="Collection receipts linked to invoices"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Receipts" }]}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "invoiceNo",
            header: "Invoice",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const inv = r.invoice as { invoicePrefix?: string; invoiceNo?: string; id?: string } | undefined
              const label = String(v || `${inv?.invoicePrefix ?? r.invoicePrefix ?? ""}${inv?.invoiceNo ?? ""}` || "—")
              const invoiceId = String(r.invoiceId ?? inv?.id ?? "")
              if (invoiceId) {
                return (
                  <MuiLink href={`/billings/${invoiceId}`} underline="hover" onClick={e => e.stopPropagation()}>
                    {label}
                  </MuiLink>
                )
              }
              return label
            },
          },
          {
            field: "dueAmount",
            header: "Billed Amount",
            align: "right",
            renderCell: (v, row) => {
              const inv = (row as { invoice?: { dueAmount?: number } }).invoice
              return formatCurrency(Number(v ?? inv?.dueAmount ?? 0))
            },
          },
          {
            field: "amount",
            header: "Paid Amount",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "createdAt",
            header: "Paid On",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "attachment",
            header: "Attachments",
            renderCell: (v, row) => {
              const name = String(v || "—")
              const url = String((row as { attachmentUrl?: string }).attachmentUrl ?? "")
              if (url && name !== "—") {
                return (
                  <MuiLink href={url} target="_blank" rel="noopener noreferrer" underline="hover" onClick={e => e.stopPropagation()}>
                    {name}
                  </MuiLink>
                )
              }
              return name
            },
          },
        ]}
        queryKey={["billings", "receipts"]}
        queryFn={(p: GridParams) => billingApi.getReceipts(p)}
        FilterPanel={FilterPanel}
        hasFilters
        isPaginated={false}
        zebraStriping
        emptyState="No receipts found."
        rowMenuItems={row => [
          {
            label: "Cancel",
            icon: <CancelOutlinedIcon fontSize="small" />,
            color: "error",
            onClick: () => setCancelId(String((row as { id?: string }).id ?? "")),
          },
        ]}
      />

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel receipt?"
        message="Canceled once, cannot be recovered. Continue?"
        confirmLabel="Cancel Receipt"
        severity="error"
        onConfirm={async () => {
          if (!cancelId) return
          try {
            toast.success(await billingApi.cancelReceipt(cancelId))
            setGridKey(k => k + 1)
            qc.invalidateQueries({ queryKey: ["billings", "receipts"] })
          } catch (e: unknown) {
            toast.error(
              (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
              ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? (e as { message?: string })?.message
              ?? "Failed to cancel receipt",
            )
            throw e
          } finally {
            setCancelId(null)
          }
        }}
        onClose={() => setCancelId(null)}
      />
    </PageShell>
  )
}
