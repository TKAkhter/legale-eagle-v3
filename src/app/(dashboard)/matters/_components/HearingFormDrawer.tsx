import { env } from '@/config/env'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Alert } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { QK } from '@lib/query/keys'

const schema = z.object({
  caseNo:       z.string().optional(),
  hearingDate:  z.string().min(1, 'Date required'),
  hearingTime:  z.string().optional(),
  location:     z.string().optional(),
  hearingType:  z.string().optional(),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; matterId: string; hearingId?: string }

export function HearingFormDrawer({ open, onClose, matterId, hearingId }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function onSubmit(data: Form) {
    setSubmitError(null)
    try {
      if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)) }
    const payload = { ...data, matter: { id: matterId } }
    if (hearingId) {
      if (!env.USE_STATIC_DATA) await axiosClient.post('/api/hearing/edit', { ...payload, hearingId })
    } else {
      if (!env.USE_STATIC_DATA) await axiosClient.post('/api/hearing/add', payload)
    }
    qc.invalidateQueries({ queryKey: ['matters','hearings', matterId] })
    onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose}
      title={hearingId ? 'Edit Hearing' : 'Schedule Hearing'}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={hearingId ? 'Update' : 'Schedule'} width={440}>
      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Hearing Details">
        <ControlledInput name="caseNo" control={control} label="Case Number" />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledDatePicker name="hearingDate" control={control} label="Hearing Date" required />
          <ControlledInput name="hearingTime" control={control} label="Time (HH:MM)" />
        </Box>
        <ControlledInput name="hearingType" control={control} label="Hearing Type" />
        <ControlledInput name="location" control={control} label="Court / Location" />
      </FormSection>
      <FormSection title="Notes">
        <ControlledInput name="notes" control={control} label="Notes" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
