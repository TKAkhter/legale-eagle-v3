import { Box, Typography, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { DateRangeFilter } from '@components/filters/DateRangeFilter'
import { InvoiceFormDrawer } from './_components/InvoiceFormDrawer'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams, InvoiceStatus } from '@/types/common.types'

const STATUSES: InvoiceStatus[] = ['Due','Paid','Overdue','Draft','Partially_Paid','Void','Canceled','Approval']

async function fetchInvoices(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const f = params.filters ?? {}
  const res = await axiosClient.post('/api/invoice/filter/all/v2', {}, {
    params: { ...qp, clientId: f.clientId ?? '', matterId: f.matterId ?? '', invoiceStatus: f.invoiceStatus ?? 'All', fromDate: f.fromDate ?? '', toDate: f.toDate ?? '' },
  })
  return res.data?.data ?? res.data
}

function InvoiceFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <ClientSelectFilter value={String(f.clientId ?? '')} onChange={v => set('clientId', v)} />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={f.invoiceStatus ?? ''} onChange={e => set('invoiceStatus', e.target.value)}>
          <MenuItem value=""><em>All</em></MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
        </Select>
      </FormControl>
      <DateRangeFilter fromDate={String(f.fromDate ?? '')} toDate={String(f.toDate ?? '')} onChange={v => setF(p => ({ ...p, ...v }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function BillingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Billing</Typography>
        <Can do={PERMISSIONS.BILLING_CREATE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Invoice</Button>
        </Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'invoiceNo', header: 'Invoice #' },
          { field: 'client', header: 'Client', renderCell: (v) => { const c = v as Record<string,string>; return c?.companyName ?? c?.firstName ?? '—' } },
          { field: 'matter', header: 'Matter', renderCell: (v) => (v as Record<string,string>)?.title ?? '—' },
          { field: 'taxableAmount', header: 'Amount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'paidAmount', header: 'Paid', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'invoiceStatus', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          { field: 'dueDate', header: 'Due', renderCell: (v) => formatDate(String(v ?? '')) },
        ]}
        queryKey={['invoices', 'list']}
        queryFn={fetchInvoices}
        FilterPanel={InvoiceFilterPanel}
        hasFilters hasExport syncWithUrl
        detailPath={(row) => `/billings/${row.id}`}
        rowMenuItems={(row) => [
          { label: 'Download PDF', icon: <FileDownloadIcon fontSize="small" />, onClick: () => window.open(`/api/invoice/pdf/download?invoiceId=${row.id}`, '_blank') },
        ]}
        defaultSortBy="issueDate" defaultSortDir="desc"
      />
      <InvoiceFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['invoices', 'list'] })}
      />
    </Box>
  )
}
