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
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { QK } from '@lib/query/keys'
import { registerOneDriveFolder } from '@lib/utils/onedrive'
import { clientSchema, type ClientForm } from '@lib/validations/client.schema'

interface Props { open: boolean; onClose: () => void; clientId?: string; onSuccess?: () => void }

export function ClientFormDrawer({ open, onClose, clientId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const isEdit = !!clientId

  const { control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: { clientType: 'PERSON', referral: false },
  })

  const hasReferral = watch('referral')

  useQuery({
    queryKey: QK.clients.detail(clientId!),
    queryFn: async () => {
      const r = await axiosClient.get('/api/client/get/by/company/' + clientId)
      const c = r.data?.data ?? r.data
      reset({
        firstName:    c?.firstName,
        lastName:     c?.lastName,
        companyName:  c?.companyName,
        clientType:   c?.clientType ?? 'PERSON',
        email:        c?.email?.[0]?.emailId ?? '',
        phone:        c?.phones?.[0]?.phoneNo ?? '',
        trnNo:        c?.trnNo ?? '',
        nationality:  c?.nationality ?? '',
        referral:     c?.referral ?? false,
        referralName: c?.referralName ?? '',
      })
      return c
    },
    enabled: !!clientId && open,
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function onSubmit(data: ClientForm) {
    setSubmitError(null)
    try {
    const payload = {
      ...data,
      email: data.email ? [{ emailId: data.email, type: 'Work', primary: true }] : [],
      phones: data.phone ? [{ phoneNo: data.phone, type: 'Mobile', codeNo: '+971', primary: true }] : [],
    }
    if (isEdit) {
      await axiosClient.post('/api/client/edit', { ...payload, clientId })
    } else {
      const res = await axiosClient.post('/api/client/add', payload)
      const newId = res.data?.data?.id ?? res.data?.id
      const name = data.companyName || `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
      if (newId) registerOneDriveFolder(newId, name, 'Client')
    }
    qc.invalidateQueries({ queryKey: QK.clients.all() })
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
      title={isEdit ? 'Edit Client' : 'New Client'}
      subtitle={isEdit ? 'Update client information' : 'Add a new client to the firm'}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Create Client'}>

      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Basic Info">
        <ControlledSelect name="clientType" control={control} label="Client Type"
          options={[{ value: 'PERSON', label: 'Individual' }, { value: 'COMPANY', label: 'Company' }]} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName" control={control} label="Last Name" />
        </Box>
        <ControlledInput name="companyName" control={control} label="Company / Trading Name" />
        <ControlledInput name="trnNo" control={control} label="TRN Number" />
        <ControlledInput name="nationality" control={control} label="Nationality" />
      </FormSection>

      <FormSection title="Contact">
        <ControlledInput name="email" control={control} label="Email" type="email" />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>

      <FormSection title="Referral">
        <ControlledCheckbox name="referral" control={control} label="This client was referred" />
        {hasReferral && <ControlledInput name="referralName" control={control} label="Referred By" />}
      </FormSection>
    </FormDrawer>
  )
}
