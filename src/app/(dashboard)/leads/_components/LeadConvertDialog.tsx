import { env } from '@/config/env'
import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Stepper, Step, StepLabel, Alert, CircularProgress, Divider } from '@mui/material'
import { useForm } from 'react-hook-form'
import { axiosClient } from '@lib/api/axios'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { useQueryClient } from '@tanstack/react-query'
import { QK } from '@lib/query/keys'

interface Props { open: boolean; onClose: () => void; leadId: string; leadName: string }

const BILLING_OPTS = ['Hourly','Fixed','Session','NoAgreement','Contingent','NonContingent'].map(v => ({ value: v, label: v }))

export function LeadConvertDialog({ open, onClose, leadId, leadName }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const { control, handleSubmit } = useForm<Record<string,string>>({
    defaultValues: { matterTitle: '', billingType: 'Hourly', notes: '' }
  })

  async function onSubmit(data: Record<string, string>) {
    setLoading(true); setError('')
    try {
      if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)) }
      if (!env.USE_STATIC_DATA) await axiosClient.post('/api/leads/convert', {
        leadId,
        matter: { title: data.matterTitle, billingType: data.billingType },
        notes: data.notes,
      })
      qc.invalidateQueries({ queryKey: QK.leads.all() })
      qc.invalidateQueries({ queryKey: QK.clients.all() })
      qc.invalidateQueries({ queryKey: QK.matters.all() })
      setDone(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Conversion failed')
    } finally { setLoading(false) }
  }

  function handleClose() { setStep(0); setDone(false); setError(''); onClose() }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Convert Lead to Client + Matter</DialogTitle>
      <DialogContent>
        {done ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color:"success.main", fontWeight:600, mb:1 }}>Conversion successful!</Typography>
            <Typography sx={{ color:"text.secondary" }}>"{leadName}" has been converted to a client and a new matter has been opened.</Typography>
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2.5 }}>
              This will create a new <strong>Client</strong> record and open a new <strong>Matter</strong> using details from the lead.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Lead: <strong>{leadName}</strong>
            </Typography>
            <Divider sx={{ mb: 2.5 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ControlledInput name="matterTitle" control={control} label="Matter Title *" required />
              <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} required />
              <ControlledInput name="notes" control={control} label="Conversion Notes" multiline rows={2} />
            </Box>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        {done ? (
          <Button variant="contained" onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading} color="success">
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Convert Lead'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
