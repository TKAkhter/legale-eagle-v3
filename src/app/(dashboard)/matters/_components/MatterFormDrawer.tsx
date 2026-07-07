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
import { QK } from '@lib/query/keys'
import { registerOneDriveFolder } from '@lib/utils/onedrive'
import { useDebounce } from '@hooks/useDebounce'
import { matterSchema, type MatterForm } from '@lib/validations/matter.schema'

const BILLING_OPTIONS = ['Hourly','Fixed','Session','NoAgreement','Contingent','NonContingent','Advance','Enforcement','SuccessRate']
  .map(v => ({ value: v, label: v }))

interface Props { open: boolean; onClose: () => void; matterId?: string; onSuccess?: () => void }

export function MatterFormDrawer({ open, onClose, matterId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const isEdit = !!matterId

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(matterSchema),
    defaultValues: { billingType: 'Hourly' },
  })

  useQuery({
    queryKey: QK.matters.detail(matterId!),
    queryFn: async () => {
      const r = await axiosClient.post('/api/matter/get/by/id', null, { params: { matterId } })
      const m = r.data?.data ?? r.data
      reset({
        title:                 m?.title,
        clientId:              m?.client?.id,
        billingType:           m?.billingType ?? 'Hourly',
        responsibleAttorneyId: m?.responsibleAttorney?.id,
        practiceAreaId:        m?.practiceArea?.id,
        departmentId:          m?.department?.id,
        description:           m?.description,
        caseNo:                m?.caseNo,
        courtLocation:         m?.courtLocation,
        openDate:              m?.openDate?.slice(0, 10),
      })
      return m
    },
    enabled: !!matterId && open,
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  const { data: users = [] } = useQuery({ queryKey: QK.users.mini(), queryFn: () => axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? []) })
  const { data: departments = [] } = useQuery({ queryKey: QK.departments.list(), queryFn: () => axiosClient.get('/api/util/list/department').then(r => r.data?.data ?? []) })
  const { data: practiceAreas = [] } = useQuery({ queryKey: QK.practiceAreas.list(), queryFn: () => axiosClient.get('/api/practice-area/get').then(r => r.data?.data ?? []) })

  const userOpts = (users as Record<string, string>[]).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
  const [clientSearch, setClientSearch] = useState('')
  const debouncedClientSearch = useDebounce(clientSearch, 400)
  const { data: clients = [] } = useQuery({
    queryKey: QK.clients.shortInfo(debouncedClientSearch),
    queryFn: async () => {
      const r = await axiosClient.get('/api/client/get/short-info', { params: { clientName: debouncedClientSearch, pageNumber: 0, pageSize: 50 } })
      return r.data?.content ?? r.data?.data?.content ?? []
    },
  })
  const clientOpts = (clients as Record<string, string>[]).map(c => ({
    value: c.id,
    label: c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id,
  }))
  const deptOpts = (departments as Record<string, string>[]).map(d => ({ value: d.id, label: d.name }))
  const paOpts   = (practiceAreas as Record<string, string>[]).map(p => ({ value: p.id, label: p.name }))

  async function onSubmit(data: MatterForm) {
    setSubmitError(null)
    try {
    const payload = {
      title: data.title,
      client: { id: data.clientId },
      billingType: data.billingType,
      responsibleAttorney: data.responsibleAttorneyId ? { id: data.responsibleAttorneyId } : undefined,
      practiceArea: data.practiceAreaId ? { id: data.practiceAreaId } : undefined,
      department: data.departmentId ? { id: data.departmentId } : undefined,
      description: data.description,
      caseNo: data.caseNo,
      courtLocation: data.courtLocation,
      openDate: data.openDate,
    }
    if (isEdit) {
      await axiosClient.post('/api/matter/edit', { ...payload, matterId })
    } else {
      const res = await axiosClient.post('/api/matter/add', payload)
      const newId = res.data?.data?.id ?? res.data?.id
      if (newId) registerOneDriveFolder(newId, data.title, 'Matter')
    }
    qc.invalidateQueries({ queryKey: QK.matters.all() })
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
      title={isEdit ? 'Edit Matter' : 'New Matter'}
      subtitle={isEdit ? 'Update matter information' : 'Open a new matter for a client'}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Open Matter'} width={560}>

      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Matter Details">
        <ControlledInput name="title" control={control} label="Matter Title" required />
        <ControlledInput name="caseNo" control={control} label="Case / Reference Number" />
        <ControlledDatePicker name="openDate" control={control} label="Open Date" />
      </FormSection>

      <FormSection title="Client & Billing">
        <ControlledAsyncSelect name="clientId" control={control} label="Client *" options={clientOpts} onInputChange={setClientSearch} required />
        <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTIONS} required />
      </FormSection>

      <FormSection title="Assignment">
        <ControlledAsyncSelect name="responsibleAttorneyId" control={control} label="Responsible Attorney" options={userOpts} />
        <ControlledAsyncSelect name="departmentId" control={control} label="Department" options={deptOpts} />
        <ControlledAsyncSelect name="practiceAreaId" control={control} label="Practice Area" options={paOpts} />
      </FormSection>

      <FormSection title="Additional Info">
        <ControlledInput name="courtLocation" control={control} label="Court / Location" />
        <ControlledInput name="description" control={control} label="Description" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
