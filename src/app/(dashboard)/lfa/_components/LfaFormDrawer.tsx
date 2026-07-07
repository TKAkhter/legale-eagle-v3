import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Box } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { QK } from '@lib/query/keys'

const BILLING_OPTS = ['Hourly','Fixed','Session','NoAgreement','Contingent','NonContingent','Advance','Enforcement','SuccessRate','Courier','Translation']
  .map(v => ({ value:v, label:v }))

interface Props { open:boolean; onClose:()=>void; lfaId?:string; onSuccess?:()=>void }

export function LfaFormDrawer({ open, onClose, lfaId, onSuccess }: Props) {
  const qc = useQueryClient()
  const isEdit = !!lfaId

  const { control, handleSubmit, watch, reset, formState:{ isSubmitting } } = useForm({
    defaultValues: { agreementNo:'', lfaTitle:'', billingType:'Hourly', fixedBillingAmount:'', contingent:'', cap:false, capAmount:'', retainer:false, retainerAmount:'', referral:false, referralPercentage:'', agreementDate:new Date().toISOString().slice(0,10) }
  })

  const hasCap      = watch('cap')
  const hasRetainer = watch('retainer')
  const hasReferral = watch('referral')
  const billingType = watch('billingType')

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function onSubmit(data: Record<string, unknown>) {
    const payload = {
      agreementNo:         data.agreementNo,
      lfaTitle:            data.lfaTitle,
      billingType:         data.billingType,
      fixedBillingAmount:  data.fixedBillingAmount ? Number(data.fixedBillingAmount) : undefined,
      contingent:          data.contingent ? Number(data.contingent) : undefined,
      cap:                 data.cap,
      capAmount:           data.capAmount ? Number(data.capAmount) : undefined,
      retainer:            data.retainer,
      retainerAmount:      data.retainerAmount ? Number(data.retainerAmount) : undefined,
      referral:            data.referral,
      referralPercentage:  data.referralPercentage ? Number(data.referralPercentage) : undefined,
      agreementDate:       data.agreementDate,
    }
    if (isEdit) {
      await axiosClient.post('/api/lfa/edit', { ...payload, lfaId })
    } else {
      await axiosClient.post('/api/lfa/add', payload)
    }
    qc.invalidateQueries({ queryKey: QK.lfa.all() })
    onSuccess?.()
    onClose()
  }

  return (
    <FormDrawer open={open} onClose={onClose}
      title={isEdit ? 'Edit LFA' : 'New LFA'}
      subtitle="Legal Fee Agreement configuration"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Create LFA'} width={520}>

      <FormSection title="Agreement Info">
        <ControlledInput name="agreementNo" control={control} label="Agreement Number" />
        <ControlledInput name="lfaTitle"    control={control} label="Title / Description" />
        <ControlledDatePicker name="agreementDate" control={control} label="Agreement Date" />
      </FormSection>

      <FormSection title="Billing Structure">
        <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} required />
        {(billingType === 'Fixed') && <ControlledInput name="fixedBillingAmount" control={control} label="Fixed Amount (AED)" type="number" />}
        {(billingType === 'Contingent' || billingType === 'NonContingent') && <ControlledInput name="contingent" control={control} label="Contingent %" type="number" />}
      </FormSection>

      <FormSection title="Cap & Retainer">
        <ControlledCheckbox name="cap"      control={control} label="Apply a billing cap" />
        {hasCap && <ControlledInput name="capAmount" control={control} label="Cap Amount (AED)" type="number" />}
        <ControlledCheckbox name="retainer" control={control} label="Collect a retainer" />
        {hasRetainer && <ControlledInput name="retainerAmount" control={control} label="Retainer Amount (AED)" type="number" />}
      </FormSection>

      <FormSection title="Referral">
        <ControlledCheckbox name="referral" control={control} label="This agreement has a referral fee" />
        {hasReferral && <ControlledInput name="referralPercentage" control={control} label="Referral %" type="number" />}
      </FormSection>
    </FormDrawer>
  )
}
