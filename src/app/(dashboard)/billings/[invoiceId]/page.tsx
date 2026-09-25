import PrintIcon from '@mui/icons-material/Print'
import HistoryIcon from '@mui/icons-material/History'
import EditIcon from '@mui/icons-material/Edit'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CancelIcon from '@mui/icons-material/Cancel'
import SyncIcon from '@mui/icons-material/Sync'
import { PageShell } from '@/components/ui/PageShell'
import { toast } from '@/lib/toast'
import { env } from '@/config/env'
import { useState } from 'react'
import {
  Box, Typography, Paper, Skeleton, Button, Divider, Chip,
  IconButton, Menu, MenuItem,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient, axiosBlob } from '@lib/api/axios'
import { billingApi } from '@/api/billing'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { downloadBlob } from '@lib/utils/downloadBlob'
import { RecordPaymentDialog } from '../_components/RecordPaymentDialog'
import { InvoiceFormDrawer } from '../_components/InvoiceFormDrawer'
import { InvoiceSendForApprovalDialog } from '../_components/InvoiceSendForApprovalDialog'
import { InvoiceSendEmailDialog } from '../_components/InvoiceSendEmailDialog'
import { CancelWithCreditDialog } from '../_components/CancelWithCreditDialog'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import EmailIcon from '@mui/icons-material/Email'
import DescriptionIcon from '@mui/icons-material/Description'
import PaidIcon from '@mui/icons-material/Paid'
import SendIcon from '@mui/icons-material/Send'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value ?? '—'}</Typography>
    </Box>
  )
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [downloading, setDownloading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [dlWord, setDlWord] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelCreditOpen, setCancelCreditOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [zohoOpen, setZohoOpen] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: () => billingApi.getById(invoiceId!),
    enabled: !!invoiceId,
  })

  const logsQuery = useQuery({
    queryKey: ['invoices', 'logs', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: 'il1', action: 'Created', userName: 'Admin', createdAt: '2026-08-01T10:00:00', details: 'Invoice drafted' },
          { id: 'il2', action: 'Sent', userName: 'Sarah Johnson', createdAt: '2026-08-02T14:00:00', details: 'Emailed to client' },
        ]
      }
      const res = await axiosClient.get('/api/activity/log/get/v2', {
        params: { type: 'Invoice', relatedToId: invoiceId, pageNumber: 0, pageSize: 50 },
      })
      const d = res.data?.data ?? res.data ?? []
      return Array.isArray(d) ? d : d.content ?? []
    },
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['invoices', 'detail', invoiceId] })
    qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
  }

  async function downloadWord() {
    setDlWord(true)
    try {
      if (env.USE_STATIC_DATA) { toast.success('Download simulated in static mode'); return }
      const r = await axiosBlob.get('/api/invoice/convert/word', { params: { invoiceId } })
      downloadBlob(r.data as Blob, `invoice-${invoice?.invoiceNo ?? invoiceId}.docx`)
    } finally { setDlWord(false) }
  }

  async function downloadPdf(opts?: { language?: string; targetCurrency?: string }) {
    setDownloading(true)
    try {
      if (env.USE_STATIC_DATA) { toast.success('Download simulated in static mode'); return }
      const suffix = [opts?.language, opts?.targetCurrency].filter(Boolean).join('-')
      downloadBlob(
        await billingApi.downloadPdf(String(invoiceId), opts),
        `invoice-${invoice?.invoiceNo ?? invoiceId}${suffix ? `-${suffix}` : ''}.pdf`,
      )
    } catch {
      toast.error('PDF download failed')
    } finally { setDownloading(false) }
  }

  if (isLoading) return <Skeleton variant="rounded" height={200} />

  const inv = invoice as Record<string, unknown> | undefined
  const client = inv?.client as Record<string, string> | undefined
  const matter = inv?.matter as Record<string, string> | undefined
  const balance = Math.max(
    0,
    Number(
      (
        Number(inv?.dueAmount ?? inv?.balanceAmount ?? 0)
        - Number(inv?.paidAmount ?? 0)
        - Number(inv?.writeOffAmount ?? 0)
        - Number(inv?.creditNoteAmount ?? 0)
      ).toFixed(2),
    ),
  )
  const availableCreditNote = Number(inv?.creditNoteAmount ?? 0)
  const status = String(inv?.invoiceStatus ?? '')
  const statusUpper = status.toUpperCase()
  const canEdit = /draft|approval|pending/i.test(status)
  const canSendApproval = !/approval|paid|void|canceled|cancelled|write_off/i.test(status)
  const isTerminal = ['VOID', 'CANCELED', 'CANCELLED', 'WRITE_OFF'].includes(statusUpper)
  const canCancelActions = !isTerminal && statusUpper !== 'PAID'
  const isCreditNote = statusUpper === 'CREDITNOTE' || statusUpper === 'CREDIT_NOTE'
  const clientZohoId = client?.zohoClientId
  const zohoId = isCreditNote ? inv?.zohoCreditNoteId : inv?.zohoInvoiceId
  const canCreateInZoho = !zohoId && !!clientZohoId && (
    isCreditNote || statusUpper === 'DUE' || statusUpper === 'PAID'
  )
  const lineItems = (Array.isArray(inv?.lineItems) ? inv.lineItems : []) as Record<string, unknown>[]

  const invNo = inv?.invoiceNo ?? invoiceId
  return (
    <PageShell title={`Invoice #${String(invNo)}`} breadcrumbs={[{label:'Billing',path:'/billings'},{label:`#${String(invNo)}`}]}>
      <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Invoice #{String(inv?.invoiceNo ?? invNo)}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <StatusBadge status={status || '—'} />
            {!!zohoId && <Chip size="small" label="Zoho" color="info" variant="outlined" />}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {canEdit && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {canSendApproval && (
            <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setApproveOpen(true)}>
              Send for Approval
            </Button>
          )}
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => void downloadPdf()} disabled={downloading}>
            {downloading ? 'Downloading…' : 'PDF'}
          </Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={downloadWord} disabled={dlWord}>
            {dlWord ? 'Exporting…' : 'Word'}
          </Button>
          <Button variant="outlined" startIcon={<EmailIcon />} onClick={() => setEmailOpen(true)}>
            Email
          </Button>
          {balance > 0 && (
            <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => setPayOpen(true)}>
              Record Payment
            </Button>
          )}
          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="More actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); void downloadPdf({ language: 'ar' }) }}>
              PDF (Arabic)
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); void downloadPdf({ targetCurrency: 'USD' }) }}>
              PDF (USD)
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                navigate(`/billings/invoice-snaps?id=${invoiceId}`)
              }}
            >
              <HistoryIcon fontSize="small" sx={{ mr: 1 }} /> Invoice History
            </MenuItem>
            {canCancelActions && (
              <MenuItem onClick={() => { setMenuAnchor(null); setCancelOpen(true) }}>
                <CancelIcon fontSize="small" sx={{ mr: 1 }} /> Cancel
              </MenuItem>
            )}
            {canCancelActions && (
              <MenuItem onClick={() => { setMenuAnchor(null); setCancelCreditOpen(true) }}>
                Cancel (Credit/Refund)
              </MenuItem>
            )}
            {canCancelActions && (
              <MenuItem onClick={() => { setMenuAnchor(null); setWriteOffOpen(true) }}>
                Write Off
              </MenuItem>
            )}
            {canCreateInZoho && (
              <MenuItem onClick={() => { setMenuAnchor(null); setZohoOpen(true) }}>
                <SyncIcon fontSize="small" sx={{ mr: 1 }} />
                {isCreditNote ? 'Create Credit Note in Zoho' : 'Create in Zoho'}
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 2, mb: 2 }}>
          <InfoRow label="Client" value={client?.companyName ?? client?.firstName} />
          <InfoRow label="Matter" value={matter?.title} />
          <InfoRow label="Issue Date" value={formatDate(inv?.issueDate as string | undefined)} />
          <InfoRow label="Due Date"   value={formatDate(inv?.dueDate as string | undefined)} />
          <InfoRow label="Billing Type" value={inv?.billingType as string | undefined} />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 2 }}>
          <InfoRow label="Subtotal"  value={formatCurrency(Number(inv?.amount ?? 0))} />
          <InfoRow label="Tax"       value={formatCurrency(Number(inv?.vatAmount ?? 0))} />
          <InfoRow label="Discount"  value={inv?.discount ? `${inv.discount}%` : '—'} />
          <InfoRow label="Total"     value={<Typography sx={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(Number(inv?.taxableAmount ?? 0))}</Typography>} />
          <InfoRow label="Paid"      value={formatCurrency(Number(inv?.paidAmount ?? 0))} />
          <InfoRow label="Balance"   value={
            <Typography sx={{ fontWeight: 600, color: balance > 0 ? 'error.main' : 'success.main' }}>
              {formatCurrency(balance)}
            </Typography>
          } />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Line Items</Typography>
        {lineItems.length === 0 && (
          <Typography variant="body2" color="text.secondary">No line items</Typography>
        )}
        {lineItems.map((item, index) => (
          <Box key={String(item.id ?? index)} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2">{String(item.description ?? '—')}</Typography>
            <Typography variant="body2" color="text.secondary">Qty {String(item.quantity ?? 1)}</Typography>
            <Typography variant="body2" color="text.secondary">{formatCurrency(Number(item.rate ?? 0))}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{formatCurrency(Number(item.amount ?? 0))}</Typography>
          </Box>
        ))}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon fontSize="small" /> Audit Log
        </Typography>
        {!((logsQuery.data ?? []) as unknown[]).length && (
          <Typography variant="body2" color="text.secondary">No log entries</Typography>
        )}
        {((logsQuery.data ?? []) as Record<string, unknown>[]).map((log, i) => (
          <Box key={String(log.id ?? i)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(log.action ?? log.logType ?? log.title ?? 'Update')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {String(log.userName ?? log.createdBy ?? '')}
                {log.details || log.note ? ` · ${String(log.details ?? log.note)}` : ''}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {log.createdAt ? formatDate(String(log.createdAt)) : '—'}
            </Typography>
          </Box>
        ))}
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.open(`/billings/print?invoiceId=${invoiceId}`, '_blank')}>Print</Button>
      </Box>

      <RecordPaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoiceId={invoiceId ?? ''}
        invoiceNo={String(inv?.invoiceNo ?? '')}
        balance={balance}
        availableCreditNote={availableCreditNote}
        defaultBankAccountId={String((client as { bankAccount?: { id?: string } } | undefined)?.bankAccount?.id ?? "")}
      />
      <InvoiceFormDrawer
        open={editOpen}
        invoiceId={invoiceId}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          invalidate()
          toast.success('Invoice updated')
        }}
      />
      <InvoiceSendForApprovalDialog
        open={approveOpen}
        invoiceId={String(invoiceId ?? '')}
        onClose={() => setApproveOpen(false)}
        onSent={() => {
          setApproveOpen(false)
          invalidate()
        }}
      />
      <InvoiceSendEmailDialog
        open={emailOpen}
        invoiceId={String(invoiceId ?? '')}
        suggestedEmails={(() => {
          const c = inv?.client as Record<string, unknown> | undefined
          const raw = (c?.email ?? c?.emails ?? []) as unknown
          const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : []
          return list.map(e => {
            if (typeof e === 'string') return e.trim()
            const o = e as { emailId?: string; email?: string }
            return String(o.emailId ?? o.email ?? '').trim()
          }).filter(Boolean)
        })()}
        onClose={() => setEmailOpen(false)}
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          toast.success(await billingApi.cancel(String(invoiceId)))
          invalidate()
        }}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice?"
        confirmLabel="Cancel Invoice"
        severity="error"
      />
      <CancelWithCreditDialog
        open={cancelCreditOpen}
        invoiceId={String(invoiceId ?? '')}
        onClose={() => setCancelCreditOpen(false)}
        onDone={() => {
          setCancelCreditOpen(false)
          invalidate()
        }}
      />
      <ConfirmDialog
        open={writeOffOpen}
        onClose={() => setWriteOffOpen(false)}
        onConfirm={async () => {
          toast.success(await billingApi.writeOff(String(invoiceId)))
          invalidate()
        }}
        title="Write Off Invoice"
        message="Are you sure you want to write off this invoice?"
        confirmLabel="Write Off"
        severity="warning"
      />
      <ConfirmDialog
        open={zohoOpen}
        onClose={() => setZohoOpen(false)}
        onConfirm={async () => {
          toast.success(await billingApi.addToZoho(String(invoiceId), { creditNote: isCreditNote }))
          invalidate()
        }}
        title="Create in Zoho"
        message={isCreditNote ? 'Create this credit note in Zoho Books?' : 'Create this invoice in Zoho Books?'}
        confirmLabel="Create in Zoho"
        severity="info"
      />
      </Box>
    </PageShell>
  )
}
