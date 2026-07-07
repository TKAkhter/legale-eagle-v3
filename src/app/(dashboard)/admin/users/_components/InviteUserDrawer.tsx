import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { Alert } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { QK } from '@lib/query/keys'

const schema = z.object({
  firstName:       z.string().min(1, 'Required'),
  lastName:        z.string().optional(),
  email:           z.string().email('Invalid email'),
  companyUserType: z.enum(['ATTORNEY','NONATTORNEY','LAWYER','LAWYER_USER']),
  departmentId:    z.string().optional(),
  designationId:   z.string().optional(),
  groupId:         z.string().optional(),
})
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; onSuccess?: () => void }

export function InviteUserDrawer({ open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { companyUserType: 'ATTORNEY' },
  })

  const { data: departments = [] } = useQuery({ queryKey: QK.departments.list(), queryFn: () => axiosClient.get('/api/util/list/department').then(r => r.data?.data ?? []) })
  const { data: designations = [] } = useQuery({ queryKey: QK.designations.list(), queryFn: () => axiosClient.get('/api/util/get/designation').then(r => r.data?.data ?? []) })
  const { data: groups = [] } = useQuery({ queryKey: QK.groups.list(), queryFn: () => axiosClient.get('/api/group/get').then(r => r.data?.data ?? []) })

  const deptOpts  = (departments  as Record<string,string>[]).map(d => ({ value: d.id, label: d.name }))
  const desgOpts  = (designations as Record<string,string>[]).map(d => ({ value: d.id, label: d.name }))
  const groupOpts = (groups       as Record<string,string>[]).map(g => ({ value: g.id, label: g.name }))

  async function onSubmit(data: Form) {
    setSubmitError(null)
    try {
    await axiosClient.post('/api/user/sendRequest', {
      firstName:       data.firstName,
      lastName:        data.lastName,
      email:           data.email,
      companyUserType: data.companyUserType,
      department:      data.departmentId ? { id: data.departmentId } : undefined,
      designation:     data.designationId ? { id: data.designationId } : undefined,
      groupId:         data.groupId,
    })
    qc.invalidateQueries({ queryKey: QK.users.list() })
    onSuccess?.()
    onClose()
    reset()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Invite User"
      subtitle="Send an invitation email to a new team member"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting} submitLabel="Send Invitation">

      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Personal Details">
        <ControlledInput name="firstName" control={control} label="First Name" required />
        <ControlledInput name="lastName" control={control} label="Last Name" />
        <ControlledInput name="email" control={control} label="Email Address" type="email" required />
      </FormSection>

      <FormSection title="Role & Department">
        <ControlledSelect name="companyUserType" control={control} label="User Type" required
          options={[
            { value: 'ATTORNEY', label: 'Attorney' },
            { value: 'NONATTORNEY', label: 'Non-Attorney' },
            { value: 'LAWYER', label: 'Lawyer' },
            { value: 'LAWYER_USER', label: 'Lawyer User' },
          ]} />
        <ControlledAsyncSelect name="departmentId" control={control} label="Department" options={deptOpts} />
        <ControlledAsyncSelect name="designationId" control={control} label="Designation" options={desgOpts} />
        <ControlledAsyncSelect name="groupId" control={control} label="Permission Group" options={groupOpts} />
      </FormSection>
    </FormDrawer>
  )
}
