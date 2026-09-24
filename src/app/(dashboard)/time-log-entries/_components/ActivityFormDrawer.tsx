import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Alert, Button, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material'
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
import { activitySchema, type ActivityForm } from '@lib/validations/activity.schema'
import { timelogsApi } from '@/api/timelogs'
import { adminApi } from '@/api/admin'
import { fileManagerApi } from '@/api/fileManager'
import { env } from '@/config/env'
import { toast } from '@/lib/toast'

const BILLING_OPTS = [
  'Hourly', 'Fixed', 'Session', 'Expense', 'Contingent', 'NonContingent',
].map(v => ({ value: v, label: v }))

const PAYMENT_TYPES = [
  { value: 'PASS_TO_CLIENT', label: 'Pass to Client' },
  { value: 'ABSORBED', label: 'Absorbed' },
]

const FALLBACK_DISBURSEMENT_TYPES = [
  { value: 'OTHER_EXPENSES', label: 'Other Expenses' },
  { value: 'COURIER', label: 'Courier' },
  { value: 'TRANSLATION', label: 'Translation' },
  { value: 'COURT_FEES', label: 'Court Fees' },
  { value: 'TRAVEL', label: 'Travel' },
]

interface Props {
  open: boolean
  onClose: () => void
  prefillMatterId?: string
  prefillClientId?: string
  prefillEntryDate?: string
  activityId?: string
  defaultActivityType?: 'Time' | 'Expense' | 'Fixed'
  onSuccess?: () => void
}

export function ActivityFormDrawer({
  open, onClose, prefillMatterId, prefillClientId, prefillEntryDate,
  activityId, defaultActivityType = 'Time', onSuccess,
}: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [receiptLabel, setReceiptLabel] = useState('')
  const receiptRef = useRef<HTMLInputElement>(null)
  const isEdit = !!activityId
  const today = new Date().toISOString().slice(0, 10)

  const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activityType: defaultActivityType,
      billable: true,
      entryDate: prefillEntryDate ?? today,
      clientId: prefillClientId ?? '',
      matterId: prefillMatterId ?? '',
      activity: '',
      hours: 0,
      minutes: 0,
      billingType: defaultActivityType === 'Expense' ? 'Expense' : 'Hourly',
      disbursementType: 'OTHER_EXPENSES',
      disbursementPaymentType: 'PASS_TO_CLIENT',
    },
  })

  const activityType = useWatch({ control, name: 'activityType' })
  const clientId = useWatch({ control, name: 'clientId' })
  const billingType = useWatch({ control, name: 'billingType' })
  const isExpense = activityType === 'Expense'

  const detailQ = useQuery({
    queryKey: ['activities', 'detail', activityId],
    queryFn: () => timelogsApi.getById(String(activityId)),
    enabled: open && !!activityId,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'short', clientSearch],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: 'c1', companyName: 'Al Rashid Holdings' },
          { id: 'c2', companyName: 'KM Group' },
        ]
      }
      const r = await axiosClient.get('/api/client/get/short-info', {
        params: { pageNumber: 0, pageSize: 50, searchText: clientSearch || undefined },
      })
      return r.data?.data?.content ?? r.data?.content ?? []
    },
    enabled: open,
  })

  const { data: matters = [] } = useQuery({
    queryKey: ['matters', 'by-client', clientId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: 'm1', title: '260303 — Building Dispute', clientId: 'c1' },
          { id: 'm2', title: '260293 — Employment', clientId: 'c2' },
        ].filter(m => !clientId || m.clientId === clientId)
      }
      if (clientId) {
        const r = await axiosClient.get('/api/matter/mini', {
          params: { clientId, pageNumber: 0, pageSize: 100 },
        })
        const d = r.data?.data ?? r.data ?? {}
        return (Array.isArray(d) ? d : d.content ?? []) as Record<string, string>[]
      }
      const r = await axiosClient.get('/api/matter/get/short-info', {
        params: { pageNumber: 0, pageSize: 100 },
      })
      return r.data?.data?.content ?? r.data?.content ?? []
    },
    enabled: open,
  })

  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => {
      if (env.USE_STATIC_DATA) return []
      return axiosClient.get('/api/user/get/min').then(r => r.data?.data ?? [])
    },
    enabled: open,
  })

  const { data: disbursementTypes = FALLBACK_DISBURSEMENT_TYPES } = useQuery({
    queryKey: ['disbursement-types'],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return FALLBACK_DISBURSEMENT_TYPES
      try {
        const r = await axiosClient.get('/api/invoice/disbursement-types')
        const raw = r.data?.data ?? r.data ?? []
        const list = Array.isArray(raw) ? raw : []
        const mapped = list.map((item: unknown) => {
          if (typeof item === 'string') return { value: item, label: item.replace(/_/g, ' ') }
          const o = item as { value?: string; code?: string; name?: string; label?: string; id?: string }
          const value = String(o.value ?? o.code ?? o.id ?? o.name ?? '')
          const label = String(o.label ?? o.name ?? value.replace(/_/g, ' '))
          return { value, label }
        }).filter((x: { value: string }) => x.value)
        return mapped.length ? mapped : FALLBACK_DISBURSEMENT_TYPES
      } catch {
        return FALLBACK_DISBURSEMENT_TYPES
      }
    },
    enabled: open && isExpense,
    staleTime: 5 * 60_000,
  })

  const { data: absorptionEnabled = false } = useQuery({
    queryKey: ['disbursement-absorption'],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return true
      try {
        const r = await axiosClient.get('/api/settings/disbursement-absorption')
        const data = r.data?.data ?? r.data
        const first = Array.isArray(data) ? data[0] : data
        return Boolean(first?.disbursementAbsorptionEnabled)
      } catch {
        return false
      }
    },
    enabled: open && isExpense,
    staleTime: 5 * 60_000,
  })

  const { data: expenseRateCards = [] } = useQuery({
    queryKey: ['rate-cards', 'Expense'],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: 'arc3', title: 'Filing Fee', rate: 100 }]
      }
      const r = await axiosClient.post('/api/rate/card/get/by/type', null, {
        params: { activityType: 'Expense' },
      })
      return r.data?.data ?? r.data ?? []
    },
    enabled: open && isExpense,
  })

  const { data: companyInfo } = useQuery({
    queryKey: ['company-info', 'onedrive-flag'],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
    enabled: open && isExpense,
    staleTime: 5 * 60_000,
  })
  const oneDriveEnabled = Boolean(companyInfo?.oneDrive)

  const clientOpts = (clients as Record<string, string>[]).map(c => ({
    value: c.id,
    label: c.companyName ?? c.name ?? c.id,
  }))
  const matterOpts = (matters as Record<string, string>[]).map(m => ({
    value: String(m.id ?? m.matterId ?? ''),
    label: m.title ?? m.matterTitle ?? String(m.id ?? ''),
  }))
  const userOpts = (users as Record<string, string>[]).map(u => ({
    value: u.id,
    label: u.fullName ?? (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.id),
  }))
  const rateCardOpts = (expenseRateCards as { id?: string; title?: string; rate?: number }[]).map(c => ({
    value: String(c.id ?? ''),
    label: `${c.title ?? c.id}${c.rate != null ? ` (${c.rate})` : ''}`,
  }))
  const disbursementTypeOpts = disbursementTypes as { value: string; label: string }[]

  useEffect(() => {
    if (!open) {
      reset()
      setReceiptLabel('')
      if (receiptRef.current) receiptRef.current.value = ''
      return
    }
    if (isEdit && detailQ.data) {
      const d = detailQ.data as Record<string, unknown>
      const matter = d.matter as { id?: string; client?: { id?: string } } | null
      const person = d.responsiblePerson as { id?: string } | null
      const client = (d.client as { id?: string } | null) ?? matter?.client
      const total = Number(d.totalHours ?? 0)
      const hours = Math.floor(total)
      const minutes = Math.round((total - hours) * 60)
      const at = String(d.activityType ?? 'Time')
      reset({
        activity: String(d.activity ?? d.note ?? ''),
        activityType: (at === 'Expense' || at === 'Fixed' ? at : 'Time') as 'Time' | 'Expense' | 'Fixed',
        billable: d.billable !== false,
        entryDate: String(d.entryDate ?? today).slice(0, 10),
        clientId: client?.id ?? prefillClientId ?? '',
        matterId: matter?.id ?? prefillMatterId ?? '',
        hours: Number(d.hours ?? hours),
        minutes: Number(d.minutes ?? minutes),
        rate: d.rate != null ? Number(d.rate) : undefined,
        responsiblePersonId: person?.id,
        billingType: d.billingType != null ? String(d.billingType) : undefined,
        disbursementType: String(d.disbursementType ?? 'OTHER_EXPENSES'),
        disbursementPaymentType: String(d.disbursementPaymentType ?? 'PASS_TO_CLIENT'),
      })
      return
    }
    reset({
      activityType: defaultActivityType,
      billable: true,
      entryDate: prefillEntryDate ?? today,
      clientId: prefillClientId ?? '',
      matterId: prefillMatterId ?? '',
      activity: '',
      hours: 0,
      minutes: 0,
      billingType: defaultActivityType === 'Expense' ? 'Expense' : 'Hourly',
      disbursementType: 'OTHER_EXPENSES',
      disbursementPaymentType: 'PASS_TO_CLIENT',
    })
  }, [open, isEdit, detailQ.data, prefillMatterId, prefillClientId, prefillEntryDate, defaultActivityType, reset, today])

  useEffect(() => {
    if (!open || isEdit) return
    if (activityType === 'Expense') {
      setValue('billingType', 'Expense')
      setValue('hours', 0)
      setValue('minutes', 0)
    }
  }, [activityType, open, isEdit, setValue])

  async function ensureDisbursementFolder(activityId: string) {
    const root = await fileManagerApi.listFolder('')
    let disbursements = root.find(f => f.type === 'folder' && f.name === 'Disbursements')
    if (!disbursements) {
      disbursements = await fileManagerApi.createFolder('', 'Disbursements')
    }
    const children = await fileManagerApi.listFolder(disbursements.id)
    let activityFolder = children.find(f => f.type === 'folder' && f.name === activityId)
    if (!activityFolder) {
      activityFolder = await fileManagerApi.createFolder(disbursements.id, activityId)
    }
    return activityFolder
  }

  async function uploadReceiptsToOneDrive(activityId: string) {
    const files = receiptRef.current?.files
    if (!files?.length || !oneDriveEnabled || env.USE_STATIC_DATA) return
    try {
      const folder = await ensureDisbursementFolder(activityId)
      const uploaded: Record<string, unknown>[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)!
        const item = await fileManagerApi.uploadFile(folder.id, file)
        uploaded.push({
          activityId,
          oneDriveItemId: item.id,
          fileId: item.id,
          fileName: item.name,
          fileSize: item.size,
          mimeType: item.mimeType ?? file.type,
          webUrl: item.webUrl ?? '',
        })
      }
      if (uploaded.length) {
        await axiosClient.post('/api/file/attachments/add', uploaded)
        toast.success('Receipts uploaded to OneDrive Disbursements folder')
      }
    } catch {
      toast.error('Expense saved, but OneDrive receipt upload failed')
    }
  }

  async function onSubmit(data: ActivityForm) {
    setSubmitError(null)
    try {
      const payload: Record<string, unknown> = {
        activity: data.activity,
        matter: { id: data.matterId },
        activityType: data.activityType,
        billingType: data.billingType ?? (data.activityType === 'Expense' ? 'Expense' : 'Hourly'),
        hours: isExpense ? 0 : (data.hours ?? 0),
        minutes: isExpense ? 0 : (data.minutes ?? 0),
        rate: data.rate,
        billable: data.billable,
        entryDate: data.entryDate,
        responsiblePerson: data.responsiblePersonId ? { id: data.responsiblePersonId } : undefined,
        activityCategory: data.activityCategory ?? 'MATTER',
      }
      if (isExpense) {
        payload.disbursementType = data.disbursementType ?? 'OTHER_EXPENSES'
        if (absorptionEnabled) {
          payload.disbursementPaymentType = data.disbursementPaymentType ?? 'PASS_TO_CLIENT'
        }
      }
      let created: unknown
      if (isEdit) created = await timelogsApi.edit({ ...payload, id: activityId })
      else created = await timelogsApi.create(payload)

      if (isExpense && !isEdit) {
        const createdId = String(
          (created as { id?: string })?.id
          ?? (created as { data?: { id?: string } })?.data?.id
          ?? '',
        )
        if (createdId && receiptRef.current?.files?.length) {
          await uploadReceiptsToOneDrive(createdId)
        }
      }

      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['timelogs'] })
      qc.invalidateQueries({ queryKey: ['calendar'] })
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
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Time Entry' : defaultActivityType === 'Expense' || isExpense ? 'Log Disbursement' : 'Log Time Entry'}
      subtitle={isExpense ? 'Record a pass-to-client expense' : 'Record billable time, expense, or fixed fee'}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Update Entry' : 'Save Entry'}
      width={560}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Activity">
        <ControlledInput name="activity" control={control} label="Activity Description" required multiline rows={2} />
        <ControlledSelect
          name="activityType"
          control={control}
          label="Type"
          options={[
            { value: 'Time', label: 'Time' },
            { value: 'Expense', label: 'Expense' },
            { value: 'Fixed', label: 'Fixed Fee' },
          ]}
        />
        <ControlledDatePicker name="entryDate" control={control} label="Date" required />
        <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} />
      </FormSection>

      <FormSection title="Client & Matter">
        <ControlledAsyncSelect
          name="clientId"
          control={control}
          label="Client"
          options={clientOpts}
          onInputChange={setClientSearch}
        />
        <ControlledAsyncSelect name="matterId" control={control} label="Matter" options={matterOpts} required />
        <ControlledAsyncSelect name="responsiblePersonId" control={control} label="Fee Earner" options={userOpts} />
      </FormSection>

      {isExpense ? (
        <FormSection title="Expense">
          <ControlledSelect
            name="disbursementType"
            control={control}
            label="Disbursement Type"
            options={disbursementTypeOpts}
            required
          />
          {absorptionEnabled && (
            <ControlledSelect
              name="disbursementPaymentType"
              control={control}
              label="Payment Type"
              options={PAYMENT_TYPES}
              required
            />
          )}
          {rateCardOpts.length > 0 && (
            <FormControl size="small" fullWidth sx={{ mb: 0 }}>
              <InputLabel>Rate Card Template</InputLabel>
              <Select
                label="Rate Card Template"
                defaultValue=""
                onChange={e => {
                  const value = String(e.target.value)
                  const card = (expenseRateCards as { id?: string; title?: string; rate?: number }[])
                    .find(c => String(c.id) === value)
                  if (card) {
                    if (card.title) setValue('activity', String(card.title))
                    if (card.rate != null) setValue('rate', Number(card.rate))
                  }
                }}
              >
                <MenuItem value="">Custom amount</MenuItem>
                {rateCardOpts.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ControlledInput name="rate" control={control} label="Amount" type="number" required />
          <ControlledCheckbox name="billable" control={control} label="Billable" />
          {!isEdit && (
            <Box>
              <Button variant="outlined" component="label" size="small">
                Attach receipts
                <input
                  ref={receiptRef}
                  hidden
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={e => {
                    const files = e.target.files
                    setReceiptLabel(files?.length ? `${files.length} file(s) selected` : '')
                  }}
                />
              </Button>
              {receiptLabel && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {receiptLabel}
                  {oneDriveEnabled ? ' · will upload to OneDrive Disbursements' : ''}
                </Typography>
              )}
            </Box>
          )}
        </FormSection>
      ) : (
        <FormSection title="Time & Rate">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <ControlledInput name="hours" control={control} label="Hours" type="number" />
            <ControlledInput name="minutes" control={control} label="Minutes" type="number" />
          </Box>
          {billingType === 'Session' && (
            <ControlledInput name="rate" control={control} label="Session Rate" type="number" />
          )}
          {billingType !== 'Session' && (
            <ControlledInput name="rate" control={control} label="Rate (per hour)" type="number" />
          )}
          <ControlledCheckbox name="billable" control={control} label="Billable" />
        </FormSection>
      )}
    </FormDrawer>
  )
}
