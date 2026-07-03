import { Box, Typography, Button, Snackbar, Alert } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'

async function fetchPendingApprovals(_params: GridParams) {
  const res = await axiosClient.get('/api/invoice/ap/get/user')
  const list = res.data?.data ?? res.data ?? []
  return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
}

export default function InvoiceApprovalPage() {
  const qc = useQueryClient()
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  async function handleApprove(row: Record<string, unknown>, approve: boolean) {
    try {
      await axiosClient.post('/api/invoice/ap/approve/single', { status: approve ? 'Completed' : 'Rejected' }, {
        params: { invoiceApprovalsId: row.id },
      })
      setSnack({ open: true, msg: approve ? 'Invoice approved' : 'Invoice rejected', severity: 'success' })
      qc.invalidateQueries({ queryKey: ['invoices', 'approval'] })
    } catch {
      setSnack({ open: true, msg: 'Action failed', severity: 'error' })
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Invoice Approvals</Typography>
      <DataGrid
        columns={[
          { field: 'invoiceNo', header: 'Invoice #' },
          { field: 'client', header: 'Client', renderCell: (v) => (v as Record<string,string>)?.companyName ?? '—' },
          { field: 'taxableAmount', header: 'Amount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'issueDate', header: 'Issued', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? 'Approval')} /> },
        ]}
        queryKey={['invoices', 'approval']}
        queryFn={fetchPendingApprovals}
        isPaginated={false}
        rowMenuItems={(row) => [
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, onClick: () => handleApprove(row, true) },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, color: 'error', onClick: () => handleApprove(row, false) },
        ]}
      />
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
