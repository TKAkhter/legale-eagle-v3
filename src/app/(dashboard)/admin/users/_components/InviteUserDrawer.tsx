import { env } from '@/config/env'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import {
  Alert, Autocomplete, Box, Checkbox, TextField,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { adminApi } from '@/api/admin'
import { QK } from '@lib/query/keys'

const schema = z.object({
  firstName:       z.string().optional(),
  lastName:        z.string().optional(),
  email:           z.string().min(1, 'Required').email('Invalid email'),
  phone:           z.string().optional(),
  companyUserType: z.enum(['ATTORNEY', 'NONATTORNEY', 'LAWYER', 'LAWYER_USER']),
  departmentId:    z.string().optional(),
  designationId:   z.string().optional(),
  reportingPersonId: z.string().optional(),
  accessPermission: z.string().min(1, 'Permission group is required'),
  practiceAreaIds: z.array(z.string()),
  cloneUser:       z.boolean(),
  cloneFromUserId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.companyUserType === 'ATTORNEY' && (!data.practiceAreaIds || data.practiceAreaIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one practice area is required for Attorney',
      path: ['practiceAreaIds'],
    })
  }
  if (data.cloneUser && !data.cloneFromUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select a user to clone from',
      path: ['cloneFromUserId'],
    })
  }
})

type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; onSuccess?: () => void }

export function InviteUserDrawer({ open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyUserType: 'ATTORNEY',
      practiceAreaIds: [],
      cloneUser: false,
      cloneFromUserId: null,
      accessPermission: '',
    },
  })

  const companyUserType = useWatch({ control, name: 'companyUserType' })
  const cloneUser = useWatch({ control, name: 'cloneUser' })

  const { data: departments = [] } = useQuery({
    queryKey: QK.departments.list(),
    queryFn: () => axiosClient.get('/api/util/list/department').then(r => r.data?.data ?? []),
    enabled: open,
  })
  const { data: designations = [] } = useQuery({
    queryKey: QK.designations.list(),
    queryFn: () => axiosClient.get('/api/util/get/designation').then(r => r.data?.data ?? []),
    enabled: open,
  })
  const { data: groups = [] } = useQuery({
    queryKey: QK.groups.list(),
    queryFn: () => axiosClient.get('/api/group/get').then(r => r.data?.data ?? []),
    enabled: open,
  })
  const { data: practiceAreas = [] } = useQuery({
    queryKey: ['practice-areas', 'all'],
    queryFn: () => adminApi.getPracticeAreas(),
    enabled: open,
  })
  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []),
    enabled: open,
  })

  const deptOpts = (departments as Record<string, string>[]).map(d => ({ value: d.id, label: d.name }))
  const desgOpts = (designations as Record<string, string>[]).map(d => ({ value: d.id, label: d.name }))
  const groupOpts = (groups as Record<string, string>[]).map(g => ({ value: g.id, label: g.name }))
  const userOpts = (users as Record<string, string>[]).map(u => ({
    value: u.id,
    label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.id,
  }))
  const practiceOpts = (practiceAreas as Record<string, unknown>[]).map(p => ({
    value: String(p.id ?? ''),
    label: String(p.name ?? p.id ?? ''),
  })).filter(p => p.value)

  async function onSubmit(data: Form) {
    setSubmitError(null)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
      } else {
        await axiosClient.post('/api/user/sendRequest', {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          phone: data.phone || '',
          companyUserType: data.companyUserType,
          accessPermission: data.accessPermission,
          practiceAreaIds: data.companyUserType === 'ATTORNEY' ? data.practiceAreaIds : [],
          department: data.departmentId ? { id: data.departmentId } : undefined,
          designation: data.designationId ? { id: data.designationId } : undefined,
          reportingPerson: data.reportingPersonId ? { id: data.reportingPersonId } : undefined,
          cloneUser: Boolean(data.cloneUser),
          cloneFromUserId: data.cloneUser ? (data.cloneFromUserId || null) : null,
        })
      }
      qc.invalidateQueries({ queryKey: QK.users.list() })
      onSuccess?.()
      onClose()
      reset()
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
      title="Invite User"
      subtitle="Send an invitation email to a new team member"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Send Invitation"
      width={520}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <FormSection title="Personal Details">
        <ControlledInput name="firstName" control={control} label="First Name" />
        <ControlledInput name="lastName" control={control} label="Last Name" />
        <ControlledInput name="email" control={control} label="Email Address" type="email" required />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>

      <FormSection title="Role & Department">
        <ControlledSelect
          name="companyUserType"
          control={control}
          label="User Type"
          required
          options={[
            { value: 'ATTORNEY', label: 'Attorney' },
            { value: 'NONATTORNEY', label: 'Non-Attorney' },
            { value: 'LAWYER', label: 'Lawyer' },
            { value: 'LAWYER_USER', label: 'Lawyer User' },
          ]}
        />
        <ControlledAsyncSelect
          name="accessPermission"
          control={control}
          label="Permission Group"
          options={groupOpts}
          required
        />
        {companyUserType === 'ATTORNEY' && (
          <Controller
            name="practiceAreaIds"
            control={control}
            render={({ field, fieldState }) => (
              <Autocomplete
                multiple
                options={practiceOpts}
                getOptionLabel={o => o.label}
                isOptionEqualToValue={(a, b) => a.value === b.value}
                value={practiceOpts.filter(o => (field.value ?? []).includes(o.value))}
                onChange={(_, v) => field.onChange(v.map(o => o.value))}
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.value}>
                    <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                    {option.label}
                  </li>
                )}
                renderInput={params => (
                  <TextField
                    {...params}
                    size="small"
                    label="Practice Areas"
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
        )}
        <ControlledAsyncSelect name="departmentId" control={control} label="Department" options={deptOpts} />
        <ControlledAsyncSelect name="designationId" control={control} label="Designation" options={desgOpts} />
        <ControlledAsyncSelect name="reportingPersonId" control={control} label="Reporting Person" options={userOpts} />
      </FormSection>

      <FormSection title="Clone Permissions">
        <ControlledCheckbox name="cloneUser" control={control} label="Mark as Clone User" />
        {cloneUser && (
          <Box sx={{ mt: 1 }}>
            <ControlledAsyncSelect
              name="cloneFromUserId"
              control={control}
              label="Select User to Clone From"
              options={userOpts}
              required
            />
          </Box>
        )}
      </FormSection>
    </FormDrawer>
  )
}
