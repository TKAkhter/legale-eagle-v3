import { useEffect, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { Alert, Box, Typography, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useQueryClient } from '@tanstack/react-query'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { QK } from '@lib/query/keys'
import { lfaApi } from '@/api/lfa'

const BILLING_OPTS = ['Hourly','Fixed','Session','NoAgreement','Contingent','NonContingent','Advance','Enforcement','SuccessRate','Courier','Translation']
  .map(v => ({ value:v, label:v }))

type RateRow = {
  designationId?: string
  designationName?: string
  rate: number
  defaultRate?: number
  sessionTypeName?: string
}

interface Props { open:boolean; onClose:()=>void; lfaId?:string; onSuccess?:()=>void }

export function LfaFormDrawer({ open, onClose, lfaId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string|null>(null)
  const isEdit = !!lfaId

  const { control, handleSubmit, watch, reset, formState:{ isSubmitting } } = useForm({
    defaultValues: {
      agreementNo:'', lfaTitle:'', billingType:'Hourly', fixedBillingAmount:'', contingent:'',
      cap:false, capAmount:'', retainer:false, retainerAmount:'', referral:false, referralPercentage:'',
      agreementDate:new Date().toISOString().slice(0,10),
      designationRate: [] as RateRow[],
      sessionRates: [] as RateRow[],
    },
  })

  const { fields: hourlyFields, replace: replaceHourly, append: appendHourly, remove: removeHourly } =
    useFieldArray({ control, name: 'designationRate' })
  const { fields: sessionFields, replace: replaceSession, append: appendSession, remove: removeSession } =
    useFieldArray({ control, name: 'sessionRates' })

  const hasCap      = watch('cap')
  const hasRetainer = watch('retainer')
  const hasReferral = watch('referral')
  const billingType = useWatch({ control, name: 'billingType' })

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (isEdit) return
    if (billingType === 'Hourly') {
      void lfaApi.getDefaultHourlyRates().then(list => {
        const rows = (Array.isArray(list) ? list : []).map((r: Record<string, unknown>) => {
          const des = r.designation as { id?: string; name?: string } | string | null
          return {
            designationId: typeof des === 'object' ? des?.id : undefined,
            designationName: typeof des === 'object' ? (des?.name ?? '') : String(des ?? r.name ?? ''),
            rate: Number(r.rate ?? r.hourlyRate ?? r.defaultRate ?? 0),
            defaultRate: Number(r.defaultRate ?? r.rate ?? 0),
          }
        })
        if (rows.length) replaceHourly(rows)
      }).catch(() => undefined)
    }
  }, [open, isEdit, billingType, reset, replaceHourly])

  useEffect(() => {
    if (!open || !isEdit || !lfaId) return
    void lfaApi.getById(lfaId).then(async (raw) => {
      const d = raw as Record<string, unknown>
      reset({
        agreementNo: String(d.agreementNo ?? ''),
        lfaTitle: String(d.lfaTitle ?? ''),
        billingType: String(d.billingType ?? 'Hourly'),
        fixedBillingAmount: d.fixedBillingAmount != null ? String(d.fixedBillingAmount) : '',
        contingent: d.contingent != null ? String(d.contingent) : '',
        cap: Boolean(d.cap),
        capAmount: d.capAmount != null ? String(d.capAmount) : '',
        retainer: Boolean(d.retainer),
        retainerAmount: d.retainerAmount != null ? String(d.retainerAmount) : '',
        referral: Boolean(d.referral),
        referralPercentage: d.referralPercentage != null ? String(d.referralPercentage) : '',
        agreementDate: String(d.agreementDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
        designationRate: [],
        sessionRates: [],
      })
      try {
        const rates = await lfaApi.getRates(lfaId) as Record<string, unknown>[]
        const hourly = rates.filter(r => String(r.billingType ?? 'Hourly') === 'Hourly').map(r => {
          const des = r.designation as { id?: string; name?: string } | null
          return {
            designationId: des?.id,
            designationName: des?.name ?? String(r.name ?? ''),
            rate: Number(r.rate ?? r.hourlyRate ?? 0),
            defaultRate: Number(r.defaultRate ?? 0),
          }
        })
        const session = rates.filter(r => String(r.billingType) === 'Session').map(r => {
          const st = r.sessionTypeName as { typeName?: string } | string | null
          return {
            sessionTypeName: typeof st === 'object' ? (st?.typeName ?? '') : String(st ?? r.name ?? ''),
            rate: Number(r.rate ?? 0),
            defaultRate: Number(r.defaultRate ?? 0),
          }
        })
        if (hourly.length) replaceHourly(hourly)
        if (session.length) replaceSession(session)
      } catch { /* keep empty rates */ }
    })
  }, [open, isEdit, lfaId, reset, replaceHourly, replaceSession])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      const designationRate = ((data.designationRate as RateRow[]) ?? []).map(r => ({
        designation: r.designationId ? { id: r.designationId, name: r.designationName } : { name: r.designationName },
        rate: Number(r.rate),
        defaultRate: Number(r.defaultRate ?? r.rate),
      }))
      const sessionRates = ((data.sessionRates as RateRow[]) ?? []).map(r => ({
        sessionTypeName: { typeName: r.sessionTypeName },
        rate: Number(r.rate),
        defaultRate: Number(r.defaultRate ?? r.rate),
      }))
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
        designationRate: data.billingType === 'Hourly' ? designationRate : undefined,
        sessionRates: data.billingType === 'Session' ? sessionRates : undefined,
      }
      if (isEdit) await lfaApi.update(String(lfaId), payload)
      else await lfaApi.create(payload)
      qc.invalidateQueries({ queryKey: QK.lfa.all() })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose}
      title={isEdit ? 'Edit LFA' : 'New LFA'}
      subtitle="Legal Fee Agreement configuration"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update' : 'Create LFA'} width={640}>

      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
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

      {billingType === 'Hourly' && (
        <FormSection title="Hourly Rates" description="Designation rates for this agreement">
          {hourlyFields.map((field, idx) => (
            <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: 1, mb: 1, alignItems: 'center' }}>
              <ControlledInput name={`designationRate.${idx}.designationName`} control={control} label="Designation" />
              <ControlledInput name={`designationRate.${idx}.rate`} control={control} label="Rate" type="number" />
              <IconButton size="small" onClick={() => removeHourly(idx)} aria-label="Remove rate">
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box
            component="button"
            type="button"
            onClick={() => appendHourly({ designationName: '', rate: 0, defaultRate: 0 })}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, border: 'none', background: 'none',
              color: 'primary.main', cursor: 'pointer', fontSize: 13, fontWeight: 600, p: 0,
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Add designation rate
          </Box>
        </FormSection>
      )}

      {billingType === 'Session' && (
        <FormSection title="Session Rates">
          {sessionFields.map((field, idx) => (
            <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: 1, mb: 1, alignItems: 'center' }}>
              <ControlledInput name={`sessionRates.${idx}.sessionTypeName`} control={control} label="Session Type" />
              <ControlledInput name={`sessionRates.${idx}.rate`} control={control} label="Rate" type="number" />
              <IconButton size="small" onClick={() => removeSession(idx)} aria-label="Remove rate">
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box
            component="button"
            type="button"
            onClick={() => appendSession({ sessionTypeName: '', rate: 0, defaultRate: 0 })}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, border: 'none', background: 'none',
              color: 'primary.main', cursor: 'pointer', fontSize: 13, fontWeight: 600, p: 0,
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Add session rate
          </Box>
          {sessionFields.length === 0 && (
            <Typography variant="caption" color="text.secondary">No session rates yet — add at least one.</Typography>
          )}
        </FormSection>
      )}

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
