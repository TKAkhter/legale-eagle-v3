import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Alert } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { QK } from '@lib/query/keys'
import { activitySchema, type ActivityForm } from '@lib/validations/activity.schema'
import { timelogsApi } from '@/api/timelogs'
import { env } from '@/config/env'

interface Props {
  open: boolean
  onClose: () => void
  prefillMatterId?: string
  activityId?: string
  onSuccess?: () => void
}

export function ActivityFormDrawer({ open, onClose, prefillMatterId, activityId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const isEdit = !!activityId
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activityType: 'Time',
      billable: true,
      entryDate: new Date().toISOString().slice(0, 10),
      matterId: prefillMatterId ?? '',
      activity: '',
      hours: 0,
      minutes: 0,
    },
  })

  const detailQ = useQuery({
    queryKey: ['activities', 'detail', activityId],
    queryFn: () => timelogsApi.getById(String(activityId)),
    enabled: open && !!activityId,
  })

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (isEdit && detailQ.data) {
      const d = detailQ.data as Record<string, unknown>
      const matter = d.matter as { id?: string } | null
      const person = d.responsiblePerson as { id?: string } | null
      const total = Number(d.totalHours ?? 0)
      const hours = Math.floor(total)
      const minutes = Math.round((total - hours) * 60)
      const at = String(d.activityType ?? 'Time')
      reset({
        activity: String(d.activity ?? d.note ?? ''),
        activityType: (at === 'Expense' || at === 'Fixed' ? at : 'Time') as 'Time' | 'Expense' | 'Fixed',
        billable: d.billable !== false,
        entryDate: String(d.entryDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
        matterId: matter?.id ?? prefillMatterId ?? '',
        hours: Number(d.hours ?? hours),
        minutes: Number(d.minutes ?? minutes),
        rate: d.rate != null ? Number(d.rate) : undefined,
        responsiblePersonId: person?.id,
        billingType: d.billingType != null ? String(d.billingType) : undefined,
      })
      return
    }
    if (prefillMatterId) reset(prev => ({ ...prev, matterId: prefillMatterId }))
  }, [open, isEdit, detailQ.data, prefillMatterId, reset])

  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => {
      if (env.USE_STATIC_DATA) return []
      return axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? [])
    },
  })
  const userOpts = (users as Record<string, string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  async function onSubmit(data: ActivityForm) {
    setSubmitError(null)
    try {
      const payload = {
        activity: data.activity,
        matter: { id: data.matterId },
        activityType: data.activityType,
        billingType: data.billingType,
        hours: data.hours ?? 0,
        minutes: data.minutes ?? 0,
        rate: data.rate,
        billable: data.billable,
        entryDate: data.entryDate,
        responsiblePerson: data.responsiblePersonId ? { id: data.responsiblePersonId } : undefined,
        activityCategory: data.activityCategory ?? 'MATTER',
      }
      if (isEdit) await timelogsApi.edit({ ...payload, id: activityId })
      else await timelogsApi.create(payload)
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['timelogs'] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Time Entry' : 'Log Time Entry'}
      subtitle="Record billable time, expense, or fixed fee"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update Entry' : 'Save Entry'}
    >
      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Activity">
        <ControlledInput name="activity" control={control} label="Activity Description" required multiline rows={2} />
        <ControlledSelect name="activityType" control={control} label="Type"
          options={[{ value: 'Time', label: 'Time' }, { value: 'Expense', label: 'Expense' }, { value: 'Fixed', label: 'Fixed Fee' }]} />
        <ControlledDatePicker name="entryDate" control={control} label="Date" required />
      </FormSection>

      <FormSection title="Matter & Person">
        <ControlledInput name="matterId" control={control} label="Matter ID" required />
        <ControlledAsyncSelect name="responsiblePersonId" control={control} label="Fee Earner" options={userOpts} />
      </FormSection>

      <FormSection title="Time & Rate">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="hours" control={control} label="Hours" type="number" />
          <ControlledInput name="minutes" control={control} label="Minutes" type="number" />
        </Box>
        <ControlledInput name="rate" control={control} label="Rate (per hour)" type="number" />
        <ControlledCheckbox name="billable" control={control} label="Billable" />
      </FormSection>
    </FormDrawer>
  )
}
