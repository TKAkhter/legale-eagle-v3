import { env } from '@/config/env'
import { useEffect, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().optional(),
  email: z.string().min(1, 'Required').email('Invalid email'),
  phone: z.string().optional(),
  companyUserType: z.enum(['ATTORNEY', 'NONATTORNEY', 'LAWYER', 'LAWYER_USER']),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  reportingPersonId: z.string().optional(),
  accessPermission: z.string().min(1, 'Permission group is required'),
  practiceAreaIds: z.array(z.string()),
  leadSourceEntry: z.boolean(),
  practiceAreaEntry: z.boolean(),
  departmentInvoiceApproval: z.boolean(),
  departmentActivitiesReview: z.boolean(),
  backEntry: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.companyUserType === 'ATTORNEY' && (!data.practiceAreaIds || data.practiceAreaIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one practice area is required for Attorney',
      path: ['practiceAreaIds'],
    })
  }
})

type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; userId: string; onSuccess?: () => void }

function practiceIdsFromUser(u: Record<string, unknown>): string[] {
  if (Array.isArray(u.practiceAreaIds)) return u.practiceAreaIds.map(String)
  if (Array.isArray(u.practiceAreas)) {
    return (u.practiceAreas as { id?: string }[]).map(p => String(p.id ?? '')).filter(Boolean)
  }
  return []
}

export function EditUserDrawer({ open, onClose, userId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      companyUserType: 'ATTORNEY',
      departmentId: '', designationId: '', reportingPersonId: '',
      accessPermission: '',
      practiceAreaIds: [],
      leadSourceEntry: false, practiceAreaEntry: false,
      departmentInvoiceApproval: false, departmentActivitiesReview: false,
      backEntry: false,
    },
  })

  const companyUserType = useWatch({ control, name: 'companyUserType' })

  useQuery({
    queryKey: QK.users.detail(userId),
    queryFn: async () => {
      const r = await axiosClient.get('/api/user/get/by/id', { params: { userId } })
      const u = (r.data?.data ?? r.data ?? {}) as Record<string, unknown>
      const dept = u.department as { id?: string } | string | undefined
      const desg = u.designation as { id?: string } | string | undefined
      const reporting = u.reportingPerson as { id?: string } | string | undefined
      reset({
        firstName: String(u.firstName ?? ''),
        lastName: String(u.lastName ?? ''),
        email: String(u.email ?? ''),
        phone: String(u.phone ?? ''),
        companyUserType: (u.companyUserType as Form['companyUserType']) ?? 'ATTORNEY',
        departmentId: typeof dept === 'object' ? String(dept?.id ?? '') : String(dept ?? ''),
        designationId: typeof desg === 'object' ? String(desg?.id ?? '') : String(desg ?? ''),
        reportingPersonId: typeof reporting === 'object'
          ? String(reporting?.id ?? '')
          : String(reporting ?? ''),
        accessPermission: String(u.accessPermission ?? (u.group as { id?: string })?.id ?? u.groupId ?? ''),
        practiceAreaIds: practiceIdsFromUser(u),
        leadSourceEntry: Boolean(u.leadSourceEntry),
        practiceAreaEntry: Boolean(u.practiceAreaEntry),
        departmentInvoiceApproval: Boolean(u.departmentInvoiceApproval),
        departmentActivitiesReview: Boolean(u.departmentActivitiesReview),
        backEntry: Boolean(u.backEntry),
      })
      return u
    },
    enabled: !!userId && open,
  })

  useEffect(() => {
    if (!open) {
      reset()
      setSubmitError(null)
    }
  }, [open, reset])

  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []),
    enabled: open,
  })
  const { data: depts = [] } = useQuery({
    queryKey: QK.departments.list(),
    queryFn: () => axiosClient.get('/api/util/list/department').then(r => r.data?.data ?? []),
    enabled: open,
  })
  const { data: desgs = [] } = useQuery({
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

  const userOpts = (users as Record<string, string>[]).map(u => ({
    value: u.id,
    label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.id,
  }))
  const deptOpts = (depts as Record<string, string>[]).map(d => ({ value: d.id, label: d.name }))
  const desgOpts = (desgs as Record<string, string>[]).map(d => ({ value: d.id, label: d.name }))
  const groupOpts = (groups as Record<string, unknown>[]).map(g => ({
    value: String(g.id ?? ''),
    label: String(g.name ?? g.groupName ?? g.id ?? ''),
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
        await axiosClient.post('/api/user/edit', {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          companyUserType: data.companyUserType,
          accessPermission: data.accessPermission,
          practiceAreaIds: data.companyUserType === 'ATTORNEY' ? data.practiceAreaIds : [],
          department: data.departmentId ? { id: data.departmentId } : undefined,
          designation: data.designationId ? { id: data.designationId } : undefined,
          reportingPerson: data.reportingPersonId ? { id: data.reportingPersonId } : undefined,
        }, { params: { userId } })

        await axiosClient.put(`/api/user/extra/permission/${userId}`, {
          leadSourceEntry: data.leadSourceEntry,
          practiceAreaEntry: data.practiceAreaEntry,
          departmentInvoiceApproval: data.departmentInvoiceApproval,
          departmentActivitiesReview: data.departmentActivitiesReview,
          backEntry: data.backEntry,
        })
      }
      qc.invalidateQueries({ queryKey: QK.users.list() })
      qc.invalidateQueries({ queryKey: QK.users.detail(userId) })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update user',
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Edit User"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Save Changes"
      width={520}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <FormSection title="Personal Details">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName" control={control} label="Last Name" />
        </Box>
        <ControlledInput name="email" control={control} label="Email" type="email" required />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>

      <FormSection title="Role & Assignment">
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

      <FormSection title="Extra Permissions">
        <ControlledCheckbox name="leadSourceEntry" control={control} label="Can add Lead Sources" />
        <ControlledCheckbox name="practiceAreaEntry" control={control} label="Can add Practice Areas" />
        <ControlledCheckbox name="departmentInvoiceApproval" control={control} label="Department Invoice Approver" />
        <ControlledCheckbox name="departmentActivitiesReview" control={control} label="Department Activities Reviewer" />
        <ControlledCheckbox name="backEntry" control={control} label="Can create back-dated entries" />
      </FormSection>
    </FormDrawer>
  )
}
