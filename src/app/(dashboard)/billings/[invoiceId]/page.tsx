import { useState } from 'react'
import { Box, Typography, Paper, Chip, Skeleton, Button, Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient, axiosBlob } from '@lib/api/axios'
import { StatusBadge } from '@components/ui/StatusBadge'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { downloadBlob } from '@lib/utils/downloadBlob'
import { RecordPaymentDialog } from '../_components/RecordPaymentDialog'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PaidIcon from '@mui/icons-material/Paid'

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
  const [downloading, setDownloading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: async () => {
      const r = await axiosClient.get('/api/invoice/get/by/id', { params: { invoiceId } })
      return r.data?.data ?? r.data
    },
    enabled: !!invoiceId,
  })

  async function downloadPdf() {
    setDownloading(true)
    try {
      const r = await axiosBlob.get('/api/invoice/convert/pdf', { params: { invoiceId } })
      downloadBlob(r.data as Blob, `invoice-${invoice?.invoiceNo ?? invoiceId}.pdf`)
    } finally { setDownloading(false) }
  }

  if (isLoading) return <Skeleton variant="rounded" height={200} />

  const client = invoice?.client as Record<string,string> | undefined
  const matter = invoice?.matter as Record<string,string> | undefined
  const balance = Number(invoice?.balanceAmount ?? 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Invoice #{invoice?.invoiceNo}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <StatusBadge status={invoice?.invoiceStatus ?? '—'} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={downloadPdf} disabled={downloading}>
            {downloading ? 'Downloading…' : 'PDF'}
          </Button>
          {balance > 0 && (
            <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => setPayOpen(true)}>
              Record Payment
            </Button>
          )}
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 2, mb: 2 }}>
          <InfoRow label="Client" value={client?.companyName ?? client?.firstName} />
          <InfoRow label="Matter" value={matter?.title} />
          <InfoRow label="Issue Date" value={formatDate(invoice?.issueDate)} />
          <InfoRow label="Due Date"   value={formatDate(invoice?.dueDate)} />
          <InfoRow label="Billing Type" value={invoice?.billingType} />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 2 }}>
          <InfoRow label="Subtotal"  value={formatCurrency(invoice?.amount)} />
          <InfoRow label="Tax"       value={formatCurrency(invoice?.vatAmount)} />
          <InfoRow label="Discount"  value={invoice?.discount ? `${invoice.discount}%` : '—'} />
          <InfoRow label="Total"     value={<Typography sx={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(invoice?.taxableAmount)}</Typography>} />
          <InfoRow label="Paid"      value={formatCurrency(invoice?.paidAmount)} />
          <InfoRow label="Balance"   value={
            <Typography sx={{ fontWeight: 600, color: balance > 0 ? 'error.main' : 'success.main' }}>
              {formatCurrency(balance)}
            </Typography>
          } />
        </Box>
      </Paper>

      <RecordPaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoiceId={invoiceId ?? ''}
        invoiceNo={invoice?.invoiceNo ?? ''}
        balance={balance}
      />
    </Box>
  )
}
