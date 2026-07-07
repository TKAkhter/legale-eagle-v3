import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, Box } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { QK } from '@lib/query/keys'

interface Props { open: boolean; onClose: () => void; userId: string; onSuccess?: () => void }

export function EditUserDrawer({ open, onClose, userId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      companyUserType: 'ATTORNEY',
      departmentId: '', designationId: '', reportingPersonId: '',
      leadSourceEntry: false, practiceAreaEntry: false,
      departmentInvoiceApproval: false, departmentActivitiesReview: false,
      backEntry: false,
    },
  })

  useQuery({
    queryKey: QK.users.detail(userId),
    queryFn: async () => {
      const r = await axiosClient.get('/api/user/get/by/id', { params: { userId } })
      const u = r.data?.data ?? r.data
      reset({
        firstName:                    u?.firstName ?? '',
        lastName:                     u?.lastName ?? '',
        email:                        u?.email ?? '',
        phone:                        u?.phone ?? '',
        companyUserType:              u?.companyUserType ?? 'ATTORNEY',
        departmentId:                 u?.department?.id ?? '',
        designationId:                u?.designation?.id ?? '',
        reportingPersonId:            u?.reportingPerson?.id ?? '',
        leadSourceEntry:              u?.leadSourceEntry ?? false,
        practiceAreaEntry:            u?.practiceAreaEntry ?? false,
        departmentInvoiceApproval:    u?.departmentInvoiceApproval ?? false,
        departmentActivitiesReview:   u?.departmentActivitiesReview ?? false,
        backEntry:                    u?.backEntry ?? false,
      })
      return u
    },
    enabled: !!userId && open,
  })

  useEffect(() => { if (!open) { reset(); setSubmitError(null) } }, [open, reset])

  const { data: users = [] } = useQuery({ queryKey: QK.users.mini(), queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []) })
  const { data: depts = [] }  = useQuery({ queryKey: QK.departments.list(), queryFn: () => axiosClient.get('/api/util/list/department').then(r => r.data?.data ?? []) })
  const { data: desgs = [] }  = useQuery({ queryKey: QK.designations.list(), queryFn: () => axiosClient.get('/api/util/get/designation').then(r => r.data?.data ?? []) })

  const userOpts = (users as Record<string,string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
  const deptOpts = (depts  as Record<string,string>[]).map(d => ({ value: d.id, label: d.name }))
  const desgOpts = (desgs  as Record<string,string>[]).map(d => ({ value: d.id, label: d.name }))

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      await axiosClient.post('/api/user/edit', {
        userId,
        firstName:     data.firstName,
        lastName:      data.lastName,
        email:         data.email,
        phone:         data.phone,
        companyUserType: data.companyUserType,
        department:    data.departmentId ? { id: data.departmentId }   : undefined,
        designation:   data.designationId ? { id: data.designationId } : undefined,
        reportingPerson: data.reportingPersonId ? { id: data.reportingPersonId } : undefined,
      })
      // Save extra permissions in a separate call
      await axiosClient.put(`/api/user/extra/permission/${userId}`, {
        leadSourceEntry:               data.leadSourceEntry,
        practiceAreaEntry:             data.practiceAreaEntry,
        departmentInvoiceApproval:     data.departmentInvoiceApproval,
        departmentActivitiesReview:    data.departmentActivitiesReview,
        backEntry:                     data.backEntry,
      })
      qc.invalidateQueries({ queryKey: QK.users.list() })
      qc.invalidateQueries({ queryKey: QK.users.detail(userId) })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update user'
      )
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Edit User"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel="Save Changes" width={520}>
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Personal Details">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName"  control={control} label="Last Name" />
        </Box>
        <ControlledInput name="email" control={control} label="Email" type="email" required />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>

      <FormSection title="Role & Assignment">
        <ControlledSelect name="companyUserType" control={control} label="User Type" required
          options={[
            { value: 'ATTORNEY', label: 'Attorney' },
            { value: 'NONATTORNEY', label: 'Non-Attorney' },
            { value: 'LAWYER', label: 'Lawyer' },
            { value: 'LAWYER_USER', label: 'Lawyer User' },
          ]} />
        <ControlledAsyncSelect name="departmentId"     control={control} label="Department"      options={deptOpts} />
        <ControlledAsyncSelect name="designationId"    control={control} label="Designation"     options={desgOpts} />
        <ControlledAsyncSelect name="reportingPersonId" control={control} label="Reporting Person" options={userOpts} />
      </FormSection>

      <FormSection title="Extra Permissions">
        <ControlledCheckbox name="leadSourceEntry"            control={control} label="Can add Lead Sources" />
        <ControlledCheckbox name="practiceAreaEntry"          control={control} label="Can add Practice Areas" />
        <ControlledCheckbox name="departmentInvoiceApproval"  control={control} label="Department Invoice Approver" />
        <ControlledCheckbox name="departmentActivitiesReview" control={control} label="Department Activities Reviewer" />
        <ControlledCheckbox name="backEntry"                  control={control} label="Can create back-dated entries" />
      </FormSection>
    </FormDrawer>
  )
}
