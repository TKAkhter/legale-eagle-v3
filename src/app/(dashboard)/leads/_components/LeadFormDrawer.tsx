import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, MenuItem } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { QK } from '@lib/query/keys'
import { leadSchema, type LeadForm } from '@lib/validations/lead.schema'

interface Props {
  open: boolean
  onClose: () => void
  leadId?: string        // if provided: edit mode
  onSuccess?: () => void
}

export function LeadFormDrawer({ open, onClose, leadId, onSuccess }: Props) {
  const qc = useQueryClient()
  const isEdit = !!leadId

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: { leadType: 'PERSON', billable: true } as LeadForm & { billable?: boolean },
  })

  // Load existing lead for edit mode
  useQuery({
    queryKey: QK.leads.detail(leadId!),
    queryFn: async () => {
      const r = await axiosClient.get('/api/leads/get/single', { params: { leadId } })
      const lead = r.data?.data ?? r.data
      reset({
        firstName:      lead?.firstName,
        lastName:       lead?.lastName,
        companyName:    lead?.companyName,
        leadType:       lead?.leadType ?? 'PERSON',
        email:          lead?.emails?.[0]?.emailId ?? '',
        phone:          lead?.phones?.[0]?.phoneNo ?? '',
        practiceAreaId: lead?.practiceArea?.id,
        leadSourceId:   lead?.leadSource?.id,
        lawyerId:       lead?.lawyer?.id,
        description:    lead?.description,
      })
      return lead
    },
    enabled: !!leadId && open,
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  // Lookup data
  const { data: users = [] } = useQuery({ queryKey: QK.users.mini(), queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []) })
  const { data: practiceAreas = [] } = useQuery({ queryKey: QK.practiceAreas.list(), queryFn: () => axiosClient.get('/api/practice-area/get').then(r => r.data?.data ?? []) })
  const { data: sources = [] } = useQuery({ queryKey: QK.sources.list(), queryFn: () => axiosClient.get('/api/lead-source/get').then(r => r.data?.data ?? []) })

  async function onSubmit(data: LeadForm) {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      leadType: data.leadType,
      emails: data.email ? [{ emailId: data.email, type: 'Work', primary: true }] : [],
      phones: data.phone ? [{ phoneNo: data.phone, type: 'Mobile', primary: true }] : [],
      practiceArea: data.practiceAreaId ? { id: data.practiceAreaId } : undefined,
      leadSource: data.leadSourceId ? { id: data.leadSourceId } : undefined,
      lawyer: data.lawyerId ? { id: data.lawyerId } : undefined,
      description: data.description,
    }
    if (isEdit) {
      await axiosClient.post('/api/leads/edit', { ...payload, leadId })
    } else {
      await axiosClient.post('/api/leads/add', payload)
    }
    qc.invalidateQueries({ queryKey: QK.leads.all() })
    onSuccess?.()
    onClose()
  }

  const userOptions = (users as Record<string, string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
  const paOptions   = (practiceAreas as Record<string, string>[]).map(p => ({ value: p.id, label: p.name }))
  const srcOptions  = (sources as Record<string, string>[]).map(s => ({ value: s.id, label: s.name }))

  return (
    <FormDrawer open={open} onClose={onClose} title={isEdit ? 'Edit Lead' : 'New Lead'}
      subtitle={isEdit ? 'Update lead information' : 'Add a new prospective client'}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Create Lead'}>

      <FormSection title="Basic Info">
        <ControlledSelect name="leadType" control={control} label="Lead Type"
          options={[{ value: 'PERSON', label: 'Individual' }, { value: 'COMPANY', label: 'Company' }]} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName" control={control} label="Last Name" />
        </Box>
        <ControlledInput name="companyName" control={control} label="Company Name" />
      </FormSection>

      <FormSection title="Contact">
        <ControlledInput name="email" control={control} label="Email" type="email" />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>

      <FormSection title="Assignment">
        <ControlledAsyncSelect name="lawyerId" control={control} label="Responsible Attorney" options={userOptions} />
        <ControlledAsyncSelect name="practiceAreaId" control={control} label="Practice Area" options={paOptions} />
        <ControlledAsyncSelect name="leadSourceId" control={control} label="Lead Source" options={srcOptions} />
      </FormSection>

      <FormSection title="Details">
        <ControlledInput name="description" control={control} label="Notes" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
