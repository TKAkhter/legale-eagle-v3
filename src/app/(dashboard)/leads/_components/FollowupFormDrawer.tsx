import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@lib/query/keys'

const schema = z.object({
  followUpContent:  z.string().min(1, 'Notes required'),
  followUpTime:     z.string().min(1, 'Date required'),
  nextFollowUpTime: z.string().optional(),
  assignToId:       z.string().optional(),
  stageCompleted:   z.boolean(),
})
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; leadId: string; onSuccess?: () => void }

export function FollowupFormDrawer({ open, onClose, leadId, onSuccess }: Props) {
  const qc = useQueryClient()
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { stageCompleted: false, followUpTime: new Date().toISOString().slice(0,10) },
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  const { data: users = [] } = useQuery({ queryKey: QK.users.mini(), queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []) })
  const userOpts = (users as Record<string,string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  async function onSubmit(data: Form) {
    await axiosClient.post('/api/leads/add/followup', {
      leadId,
      followUpContent:  data.followUpContent,
      followUpTime:     data.followUpTime,
      nextFollowUpTime: data.nextFollowUpTime,
      assignTo:         data.assignToId ? { id: data.assignToId } : undefined,
      stageCompleted:   data.stageCompleted,
      files:            [],
    })
    qc.invalidateQueries({ queryKey: ['leads','followups', leadId] })
    onSuccess?.()
    onClose()
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Add Follow-up"
      subtitle="Record activity or schedule the next follow-up"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel="Save Follow-up" width={440}>
      <FormSection title="Follow-up Details">
        <ControlledInput name="followUpContent" control={control} label="Notes *" multiline rows={4} required />
        <ControlledDatePicker name="followUpTime"     control={control} label="Follow-up Date *" required />
        <ControlledDatePicker name="nextFollowUpTime" control={control} label="Next Follow-up Date" />
        <ControlledAsyncSelect name="assignToId" control={control} label="Assign To" options={userOpts} />
        <ControlledCheckbox name="stageCompleted" control={control} label="This stage is complete" />
      </FormSection>
    </FormDrawer>
  )
}
