import { env } from '@/config/env'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Alert } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { unwrapAxiosList } from '@lib/utils/unwrap'

const schema = z.object({
  matterId:     z.string().min(1, 'Matter is required'),
  caseNo:       z.string().optional(),
  hearingDate:  z.string().min(1, 'Date required'),
  hearingTime:  z.string().optional(),
  location:     z.string().optional(),
  hearingType:  z.string().optional(),
  notes:        z.string().optional(),
})
type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  /** When set, matter is fixed (matter detail). When omitted, user picks a matter. */
  matterId?: string
  hearingId?: string
  /** Prefill when editing from a list row (avoids extra fetch). */
  initial?: Partial<{
    caseNo: string
    hearingDate: string
    hearingTime: string
    location: string
    hearingType: string
    notes: string
  }>
  onSuccess?: () => void
}

export function HearingFormDrawer({ open, onClose, matterId: fixedMatterId, hearingId, initial, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const needsMatterPick = !fixedMatterId
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      matterId: fixedMatterId ?? '',
      caseNo: '',
      hearingDate: '',
      hearingTime: '',
      location: '',
      hearingType: '',
      notes: '',
    },
  })

  const { data: matters = [] } = useQuery({
    queryKey: ['matters', 'short', 'hearing-form'],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: 'm1', title: '260303 — Building Dispute' }]
      const r = await axiosClient.get('/api/matter/get/short-info', { params: { pageNumber: 0, pageSize: 100 } })
      return unwrapAxiosList(r.data)
    },
    enabled: open && needsMatterPick,
  })

  const matterOpts = useMemo(
    () => (matters as Record<string, string>[]).map(m => ({
      value: String(m.id ?? m.matterId),
      label: String(m.title ?? m.matterId ?? m.id),
    })),
    [matters],
  )

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset({
      matterId: fixedMatterId ?? '',
      caseNo: initial?.caseNo ?? '',
      hearingDate: initial?.hearingDate ? String(initial.hearingDate).slice(0, 10) : '',
      hearingTime: initial?.hearingTime ?? '',
      location: initial?.location ?? '',
      hearingType: initial?.hearingType ?? '',
      notes: initial?.notes ?? '',
    })
  }, [open, fixedMatterId, initial, reset])

  async function onSubmit(data: Form) {
    setSubmitError(null)
    const matterId = fixedMatterId || data.matterId
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
      } else {
        const payload = {
          caseNo: data.caseNo,
          hearingDate: data.hearingDate,
          hearingTime: data.hearingTime,
          location: data.location,
          hearingType: data.hearingType,
          notes: data.notes,
          matter: { id: matterId },
        }
        if (hearingId) {
          await axiosClient.post('/api/hearing/edit', { ...payload, hearingId })
        } else {
          await axiosClient.post('/api/hearing/add', payload)
        }
      }
      qc.invalidateQueries({ queryKey: ['matters', 'hearings', matterId] })
      qc.invalidateQueries({ queryKey: ['hearings'] })
      qc.invalidateQueries({ queryKey: ['team', 'upcoming-hearings'] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={hearingId ? 'Edit Hearing' : 'Schedule Hearing'}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={hearingId ? 'Update' : 'Schedule'}
      width={480}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Hearing Details">
        {needsMatterPick && (
          <ControlledAsyncSelect name="matterId" control={control} label="Matter *" options={matterOpts} required />
        )}
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
