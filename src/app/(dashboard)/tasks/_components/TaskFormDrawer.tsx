import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert } from '@mui/material'
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
import { taskSchema, type TaskForm } from '@lib/validations/task.schema'

interface Props { open: boolean; onClose: () => void; taskId?: string; onSuccess?: () => void }

export function TaskFormDrawer({ open, onClose, taskId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const isEdit = !!taskId
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { eventType: 'MATTER', priority: 'Normal', requiresApproval: false },
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  const { data: users = [] } = useQuery({ queryKey: QK.users.mini(), queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []) })
  const userOpts = (users as Record<string, string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  async function onSubmit(data: TaskForm) {
    setSubmitError(null)
    try {
    const payload = {
      taskName: data.taskName,
      eventType: data.eventType,
      eventTypeId: data.eventTypeId,
      assignedTo: data.assignedToId ? { id: data.assignedToId } : undefined,
      taskDeadLine: data.taskDeadLine,
      priority: data.priority,
      taskDescription: data.taskDescription,
      requiresApproval: data.requiresApproval,
    }
    if (isEdit) {
      await axiosClient.post('/api/task/edit', { ...payload, taskId })
    } else {
      await axiosClient.post('/api/task/add', payload)
    }
    qc.invalidateQueries({ queryKey: QK.tasks.all() })
    onSuccess?.()
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
      title={isEdit ? 'Edit Task' : 'New Task'}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Create Task'}>

      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Task Info">
        <ControlledInput name="taskName" control={control} label="Task Name" required />
        <ControlledSelect name="priority" control={control} label="Priority"
          options={[{ value: 'High', label: 'High' }, { value: 'Normal', label: 'Normal' }, { value: 'Low', label: 'Low' }]} />
        <ControlledDatePicker name="taskDeadLine" control={control} label="Deadline" />
      </FormSection>

      <FormSection title="Assignment">
        <ControlledAsyncSelect name="assignedToId" control={control} label="Assign To" options={userOpts} />
        <ControlledSelect name="eventType" control={control} label="Related To"
          options={[{ value: 'MATTER', label: 'Matter' }, { value: 'CLIENT', label: 'Client' }, { value: 'LEAD', label: 'Lead' }, { value: 'GENERAL', label: 'General' }]} />
      </FormSection>

      <FormSection title="Details">
        <ControlledInput name="taskDescription" control={control} label="Description" multiline rows={3} />
        <ControlledCheckbox name="requiresApproval" control={control} label="Requires approval before completion" />
      </FormSection>
    </FormDrawer>
  )
}
