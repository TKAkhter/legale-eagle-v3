import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Alert, CircularProgress, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { axiosClient } from '@lib/api/axios'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@lib/utils/formatCurrency'

interface Props { open: boolean; onClose: () => void; invoiceId: string; invoiceNo: string; balance: number }

const PAYMENT_MODES = [
  { value: 'BankTransfer', label: 'Bank Transfer' },
  { value: 'Cash',         label: 'Cash' },
  { value: 'Cheque',       label: 'Cheque' },
  { value: 'CreditCard',   label: 'Credit Card' },
  { value: 'Online',       label: 'Online Payment' },
]

export function RecordPaymentDialog({ open, onClose, invoiceId, invoiceNo, balance }: Props) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { amount: balance, paymentDate: new Date().toISOString().slice(0,10), paymentMode: 'BankTransfer', referenceNo: '' }
  })

  async function onSubmit(data: Record<string, unknown>) {
    setError('')
    try {
      await axiosClient.post('/api/invoice/pay', { ...data, invoiceId })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      reset(); onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Payment failed')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Record Payment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Invoice <strong>#{invoiceNo}</strong> — Outstanding balance: <strong>{formatCurrency(balance)}</strong>
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ControlledInput name="amount"      control={control} label="Amount" type="number" required />
          <ControlledDatePicker name="paymentDate" control={control} label="Payment Date" required />
          <ControlledSelect name="paymentMode" control={control} label="Payment Mode" options={PAYMENT_MODES} required />
          <ControlledInput name="referenceNo" control={control} label="Reference / Receipt No" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" color="success" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Record Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
