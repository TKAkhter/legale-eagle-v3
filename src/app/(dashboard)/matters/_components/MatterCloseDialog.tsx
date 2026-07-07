import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Alert, CircularProgress, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { axiosClient } from '@lib/api/axios'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { useQueryClient } from '@tanstack/react-query'

interface Props { open: boolean; onClose: () => void; matterId: string; matterTitle: string }

const CLOSE_REASONS = [
  { value: 'Settled',    label: 'Settled' },
  { value: 'Withdrawn',  label: 'Withdrawn' },
  { value: 'Judgment',   label: 'Judgment obtained' },
  { value: 'Abandoned',  label: 'Abandoned' },
  { value: 'Other',      label: 'Other' },
]

export function MatterCloseDialog({ open, onClose, matterId, matterTitle }: Props) {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { closeDate: new Date().toISOString().slice(0, 10), closeReason: 'Settled', closingNote: '' }
  })

  async function onSubmit(data: Record<string, string>) {
    setError('')
    try {
      await axiosClient.post('/api/matter/close', { matterId, ...data })
      qc.invalidateQueries({ queryKey: ['matters'] })
      reset()
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to close matter')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Close Matter</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Closing "<strong>{matterTitle}</strong>" will archive it and stop any running timers.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ControlledDatePicker name="closeDate"   control={control} label="Close Date" required />
          <ControlledSelect    name="closeReason"  control={control} label="Close Reason" options={CLOSE_REASONS} required />
          <ControlledInput     name="closingNote"  control={control} label="Closing Notes" multiline rows={3} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Close Matter'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
