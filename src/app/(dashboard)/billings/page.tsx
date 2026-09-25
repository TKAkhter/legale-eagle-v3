import { PageShell } from '@/components/ui/PageShell'
import { Box, Button, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PaidIcon from '@mui/icons-material/Paid'
import CancelIcon from '@mui/icons-material/Cancel'
import MarkunreadOutlinedIcon from '@mui/icons-material/MarkunreadOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import { InvoiceSendForApprovalDialog } from './_components/InvoiceSendForApprovalDialog'
import { InvoiceSendEmailDialog } from './_components/InvoiceSendEmailDialog'
import { CancelWithCreditDialog } from './_components/CancelWithCreditDialog'
import SendIcon from '@mui/icons-material/Send'
import EmailIcon from '@mui/icons-material/Email'
import HistoryIcon from '@mui/icons-material/History'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [cancelId, setCancelId] = useState<string>()
  const [cancelCreditId, setCancelCreditId] = useState<string>()
  const [writeOffId, setWriteOffId] = useState<string>()
  const [approveId, setApproveId] = useState<string>()
  const [emailTarget, setEmailTarget] = useState<{ id: string; emails: string[] }>()
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

  async function downloadPdf(id: string, invoiceNo?: string, opts?: { language?: string; targetCurrency?: string }) {
    try {
      const suffix = [opts?.language, opts?.targetCurrency].filter(Boolean).join("-")
      downloadBlob(
        await billingApi.downloadPdf(id, opts),
        `invoice-${invoiceNo ?? id}${suffix ? `-${suffix}` : ""}.pdf`,
      )
    } catch {
      toast.error("PDF download failed")
    }
  }

  function clientEmailsFromRow(row: Record<string, unknown>): string[] {
    const client = (row.client ?? row.clientMini) as Record<string, unknown> | undefined
    const raw = (client?.email ?? client?.emails ?? row.clientEmails ?? []) as unknown
    const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : []
    const emails = list.map(e => {
      if (typeof e === "string") return e.trim()
      const o = e as { emailId?: string; email?: string }
      return String(o.emailId ?? o.email ?? "").trim()
    }).filter(Boolean)
    return Array.from(new Set(emails))
  }

  return (
    <PageShell
      title={t("nav.billings")}
      description={t("pages.billingsDesc")}
      action={(
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" component={RouterLink} to="/billing" startIcon={<ReceiptLongIcon />}>
            {t("nav.generateBill")}
          </Button>
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
          {
            field: 'client',
            header: 'Client',
            renderCell: (v, row) => {
              const c = (v ?? (row as Record<string, unknown>).clientMini) as Record<string, string> | null
              return c?.companyName ?? c?.firstName ?? '—'
            },
          },
          { field: 'department', header: 'Department', renderCell: (v, row) => String(v || (row as Record<string, unknown>).departmentName || '—') },
          {
            field: 'billingType',
            header: 'Billing Type',
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).invoiceBillingType || '—'),
          },
          { field: 'lfaNo', header: 'LFA #', renderCell: v => String(v || '—') },
          { field: 'matter', header: 'Matter', renderCell: (v) => (v as Record<string,string>)?.title ?? '—' },
          { field: 'issueDate', header: 'Created', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'dueDate', header: 'Due', renderCell: (v) => formatDate(String(v ?? '')) },
          {
            field: 'amount',
            header: 'Actual Amt',
            align: 'right',
            renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).actualAmount ?? 0)),
          },
          { field: 'discountAmount', header: 'Discount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'vatAmount', header: 'Tax', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'writeOffAmount', header: 'Write-off', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'creditNoteAmount', header: 'Credit Note', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          {
            field: 'taxableAmount',
            header: 'Amount Due',
            align: 'right',
            renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).dueAmount ?? 0)),
          },
          { field: 'paidAmount', header: 'Paid', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          {
            field: 'invoiceStatus',
            header: 'Status',
            renderCell: (v, row) => <StatusBadge status={String(v ?? (row as Record<string, unknown>).paymentStaus ?? '')} />,
          },
          {
            field: 'createdBy',
            header: 'Created By',
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).createdByName || '—'),
          },
        ]}
        queryKey={['invoices', 'list']}
        queryFn={(p: GridParams) => billingApi.getAll(p)}
        FilterPanel={InvoiceFilterPanel}
        hasFilters
        syncWithUrl
        isSortingBackend={false}
        detailPath={(row) => `/billings/${String((row as { id?: string }).id ?? '')}`}
        rowMenuItems={(row) => {
          const r = row as Record<string, unknown> & { id?: string; invoiceNo?: string; invoiceStatus?: string; paymentStaus?: string }
          const id = String(r.id ?? '')
          const status = String(r.invoiceStatus ?? r.paymentStaus ?? '').toUpperCase()
          const canSendApproval = !['APPROVAL', 'PAID', 'VOID', 'CANCELED', 'CANCELLED', 'WRITE_OFF'].includes(status)
          return [
            { label: 'View', onClick: () => navigate(`/billings/${id}`) },
            { label: 'Download PDF', icon: <FileDownloadIcon fontSize="small" />, onClick: () => downloadPdf(id, r.invoiceNo) },
            { label: 'PDF (Arabic)', onClick: () => downloadPdf(id, r.invoiceNo, { language: 'ar' }) },
            { label: 'PDF (USD)', onClick: () => downloadPdf(id, r.invoiceNo, { targetCurrency: 'USD' }) },
            {
              label: 'Send Email',
              icon: <EmailIcon fontSize="small" />,
              onClick: () => setEmailTarget({ id, emails: clientEmailsFromRow(r) }),
            },
            { label: 'Record Payment', icon: <PaidIcon fontSize="small" />, onClick: () => navigate(`/payment?invoiceId=${id}`) },
            {
              label: 'Invoice History',
              icon: <HistoryIcon fontSize="small" />,
              onClick: () => navigate(`/billings/invoice-snaps?id=${id}`),
            },
            ...(canSendApproval
              ? [{ label: 'Send for Approval', icon: <SendIcon fontSize="small" />, onClick: () => setApproveId(id) }]
              : []),
            { label: 'Cancel', icon: <CancelIcon fontSize="small" />, onClick: () => setCancelId(id) },
            { label: 'Cancel (Credit/Refund)', onClick: () => setCancelCreditId(id) },
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
      <InvoiceSendForApprovalDialog
        open={!!approveId}
        invoiceId={String(approveId ?? '')}
        onClose={() => setApproveId(undefined)}
        onSent={() => {
          setApproveId(undefined)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
        }}
      />
      <InvoiceSendEmailDialog
        open={!!emailTarget}
        invoiceId={String(emailTarget?.id ?? '')}
        suggestedEmails={emailTarget?.emails ?? []}
        onClose={() => setEmailTarget(undefined)}
        onSent={() => setEmailTarget(undefined)}
      />
      <CancelWithCreditDialog
        open={!!cancelCreditId}
        invoiceId={String(cancelCreditId ?? '')}
        onClose={() => setCancelCreditId(undefined)}
        onDone={() => {
          setCancelCreditId(undefined)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
        }}
      />
    </PageShell>
  )
}
