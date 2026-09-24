import { PageShell } from '@/components/ui/PageShell'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { InvoiceApprovalReviewDialog } from './_components/InvoiceApprovalReviewDialog'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import { toast } from '@/lib/toast'
import type { GridParams } from '@/types/common.types'
import { env } from '@/config/env'
import { invoiceApprovals as staticInvoiceApprovals } from '@/data/static'

async function fetchPendingApprovals(_params: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticInvoiceApprovals
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const res = await axiosClient.get('/api/invoice/ap/get/user')
  const list = res.data?.data ?? res.data ?? []
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function InvoiceApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [reviewRow, setReviewRow] = useState<Record<string, unknown> | null>(null)

  async function handleApprove(row: Record<string, unknown>, approve: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post(
          '/api/invoice/ap/approve/single',
          { status: approve ? 'Completed' : 'Rejected', rejectedReason: approve ? '' : 'Rejected' },
          { params: { invoiceApprovalsId: row.id } },
        )
      }
      toast.success(approve ? 'Invoice approved' : 'Invoice rejected')
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['invoices', 'approval'] })
    } catch {
      toast.error('Action failed')
    }
  }

  return (
    <PageShell title="Invoice Approvals" description="Invoices pending your approval">
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'invoiceNo', header: 'Invoice #' },
          { field: 'client', header: 'Client', renderCell: v => (v as Record<string, string>)?.companyName ?? '—' },
          { field: 'taxableAmount', header: 'Amount', align: 'right', renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: 'issueDate', header: 'Issued', renderCell: v => formatDate(String(v ?? '')) },
          { field: 'status', header: 'Status', renderCell: (v, row) => <StatusBadge status={String(v ?? (row as Record<string, unknown>).invoiceStatus ?? 'Approval')} /> },
        ]}
        queryKey={['invoices', 'approval']}
        queryFn={fetchPendingApprovals}
        isPaginated={false}
        rowMenuItems={row => [
          { label: 'Review', icon: <VisibilityIcon fontSize="small" />, onClick: () => setReviewRow(row as Record<string, unknown>) },
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, onClick: () => handleApprove(row, true) },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, color: 'error', onClick: () => handleApprove(row, false) },
        ]}
      />
      <InvoiceApprovalReviewDialog
        open={!!reviewRow}
        onClose={() => setReviewRow(null)}
        approval={reviewRow}
        onDone={() => {
          setReviewRow(null)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ['invoices', 'approval'] })
        }}
      />
    </PageShell>
  )
}
