import { PageShell } from '@/components/ui/PageShell'
import { Box, Button, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PaidIcon from '@mui/icons-material/Paid'
import CancelIcon from '@mui/icons-material/Cancel'
import MarkunreadOutlinedIcon from '@mui/icons-material/MarkunreadOutlined'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PERMISSIONS } from '@config/permissions'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { MatterSelectFilter } from '@components/filters/MatterSelectFilter'
import { DateRangeFilter } from '@components/filters/DateRangeFilter'
import { InvoiceFormDrawer } from './_components/InvoiceFormDrawer'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams, InvoiceStatus } from '@/types/common.types'
import { billingApi } from '@/api/billing'
import { toast } from '@/lib/toast'
import { downloadBlob } from '@lib/utils/downloadBlob'

const STATUSES: InvoiceStatus[] = ['Due','Paid','Overdue','Draft','Partially_Paid','Void','Canceled','Approval','Rejected','Write_Off','CreditNote']
const BILLING_TYPES = ['Hourly','Fixed','Session','Contingent','NonContingent','Advance','Enforcement','SuccessRate']

function InvoiceFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <ClientSelectFilter value={String(f.clientId ?? '') || undefined} onChange={v => set('clientId', v)} />
      <MatterSelectFilter value={String(f.matterId ?? '') || undefined} onChange={v => set('matterId', v)} />
      <TextField size="small" label="Invoice #" value={String(f.invoiceNo ?? '')} onChange={e => set('invoiceNo', e.target.value)} />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={String(f.invoiceStatus ?? '')} onChange={e => set('invoiceStatus', e.target.value)}>
          <MenuItem value=""><em>All</em></MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Billing Type</InputLabel>
        <Select label="Billing Type" value={String(f.billingType ?? '')} onChange={e => set('billingType', e.target.value)}>
          <MenuItem value=""><em>All</em></MenuItem>
          {BILLING_TYPES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      <DateRangeFilter fromDate={String(f.fromDate ?? '')} toDate={String(f.toDate ?? '')} onChange={v => setF(p => ({ ...p, ...v }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
      </Box>
    </Box>
  )
}

export default function BillingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [cancelId, setCancelId] = useState<string>()
  const [writeOffId, setWriteOffId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function emailExcel() {
    try {
      toast.success(await billingApi.requestExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  async function downloadPdf(id: string, invoiceNo?: string) {
    try {
      downloadBlob(await billingApi.downloadPdf(id), `invoice-${invoiceNo ?? id}.pdf`)
    } catch {
      toast.error("PDF download failed")
    }
  }

  return (
    <PageShell
      title="Billing"
      description="Invoices and payment records"
      action={(
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>Email Excel</Button>
          <Can do={PERMISSIONS.BILLING_CREATE}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Invoice</Button>
          </Can>
        </Box>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'invoiceNo', header: 'Invoice #' },
          { field: 'taxInvoiceNo', header: 'Tax Inv #', renderCell: v => String(v || '—') },
          { field: 'client', header: 'Client', renderCell: (v) => { const c = v as Record<string,string>; return c?.companyName ?? c?.firstName ?? '—' } },
          { field: 'department', header: 'Department', renderCell: v => String(v || '—') },
          { field: 'billingType', header: 'Billing Type', renderCell: v => String(v || '—') },
          { field: 'lfaNo', header: 'LFA #', renderCell: v => String(v || '—') },
          { field: 'matter', header: 'Matter', renderCell: (v) => (v as Record<string,string>)?.title ?? '—' },
          { field: 'issueDate', header: 'Created', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'dueDate', header: 'Due', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'amount', header: 'Actual Amt', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'discountAmount', header: 'Discount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'vatAmount', header: 'Tax', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'writeOffAmount', header: 'Write-off', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'creditNoteAmount', header: 'Credit Note', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'taxableAmount', header: 'Amount Due', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'paidAmount', header: 'Paid', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'invoiceStatus', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          { field: 'createdBy', header: 'Created By', renderCell: v => String(v || '—') },
        ]}
        queryKey={['invoices', 'list']}
        queryFn={(p: GridParams) => billingApi.getAll(p)}
        FilterPanel={InvoiceFilterPanel}
        hasFilters
        syncWithUrl
        isSortingBackend={false}
        detailPath={(row) => `/billings/${String((row as { id?: string }).id ?? '')}`}
        rowMenuItems={(row) => {
          const r = row as { id?: string; invoiceNo?: string; invoiceStatus?: string }
          const id = String(r.id ?? '')
          return [
            { label: 'View', onClick: () => navigate(`/billings/${id}`) },
            { label: 'Download PDF', icon: <FileDownloadIcon fontSize="small" />, onClick: () => downloadPdf(id, r.invoiceNo) },
            { label: 'Record Payment', icon: <PaidIcon fontSize="small" />, onClick: () => navigate(`/billings/${id}`) },
            { label: 'Cancel', icon: <CancelIcon fontSize="small" />, onClick: () => setCancelId(id) },
            { label: 'Write Off', onClick: () => setWriteOffId(id) },
          ]
        }}
        defaultSortBy="issueDate"
        defaultSortDir="desc"
        defaultPageSize={10}
      />
      <InvoiceFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setCreateOpen(false); setGridKey(k => k + 1); qc.invalidateQueries({ queryKey: ['invoices', 'list'] }) }}
      />
      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(undefined)}
        onConfirm={async () => {
          toast.success(await billingApi.cancel(String(cancelId)))
          setGridKey(k => k + 1)
        }}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice?"
        confirmLabel="Cancel Invoice"
        severity="error"
      />
      <ConfirmDialog
        open={!!writeOffId}
        onClose={() => setWriteOffId(undefined)}
        onConfirm={async () => {
          toast.success(await billingApi.writeOff(String(writeOffId)))
          setGridKey(k => k + 1)
        }}
        title="Write Off Invoice"
        message="Are you sure you want to write off this invoice?"
        confirmLabel="Write Off"
        severity="warning"
      />
    </PageShell>
  )
}
