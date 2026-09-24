import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { Box, Alert, Typography, Checkbox, Paper, Chip, IconButton, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { ControlledSelect } from '@components/forms/ControlledSelect'
import { QK } from '@lib/query/keys'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import { billingApi } from '@/api/billing'
import { env } from '@/config/env'

type ItemRow = { name: string; rate: number; delete: boolean }

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** When set, drawer edits an existing invoice (LMS EditBill). */
  invoiceId?: string
}

export function InvoiceFormDrawer({ open, onClose, onSuccess, invoiceId }: Props) {
  const qc = useQueryClient()
  const isEdit = !!invoiceId
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const dueDefault = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      clientId: '',
      matterId: '',
      lfaId: '',
      issueDate: today,
      dueDate: dueDefault,
      dateOfSupply: today,
      tax: '5',
      discount: '0',
      discountType: 'Percentage',
      discountAmount: '0',
      notes: '',
      items: [] as ItemRow[],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' })
  const matterId = useWatch({ control, name: 'matterId' })
  const clientId = useWatch({ control, name: 'clientId' })
  const discount = Number(useWatch({ control, name: 'discount' }) || 0)
  const discountType = useWatch({ control, name: 'discountType' })
  const discountAmount = Number(useWatch({ control, name: 'discountAmount' }) || 0)
  const tax = Number(useWatch({ control, name: 'tax' }) || 0)
  const items = useWatch({ control, name: 'items' }) ?? []

  const detailQ = useQuery({
    queryKey: ['invoices', 'detail', invoiceId, 'edit'],
    queryFn: () => billingApi.getById(String(invoiceId)),
    enabled: open && isEdit,
  })

  useEffect(() => {
    if (!open) {
      reset()
      setSelectedActivities([])
      setActivities([])
      return
    }
    if (isEdit && detailQ.data) {
      const inv = detailQ.data as Record<string, unknown>
      const matter = inv.matter as { id?: string } | null
      const client = inv.client as { id?: string } | null
      const lfa = inv.lfa as { id?: string } | null
      const existingItems = (inv.items as ItemRow[] | undefined) ?? []
      reset({
        clientId: client?.id ?? '',
        matterId: matter?.id ?? '',
        lfaId: lfa?.id ?? '',
        issueDate: String(inv.issueDate ?? today).slice(0, 10),
        dueDate: String(inv.dueDate ?? dueDefault).slice(0, 10),
        dateOfSupply: String(inv.dateOfSupply ?? inv.issueDate ?? today).slice(0, 10),
        tax: String(inv.tax ?? 5),
        discount: String(inv.discount ?? 0),
        discountType: String(inv.discountType ?? 'Percentage'),
        discountAmount: String(inv.discountAmount ?? 0),
        notes: String(inv.notes ?? inv.note ?? ''),
        items: existingItems.length
          ? existingItems.map(i => ({ name: String(i.name ?? ''), rate: Number(i.rate ?? 0), delete: false }))
          : [{ name: 'Professional fees', rate: Number(inv.finalAmount ?? inv.total ?? 0), delete: false }],
      })
      const aids = (inv.activityIds as string[] | undefined)
        ?? ((inv.activities as { id?: string }[] | undefined)?.map(a => String(a.id)).filter(Boolean) ?? [])
      setSelectedActivities(aids)
    }
  }, [open, isEdit, detailQ.data, reset, today, dueDefault])

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'short', clientSearch],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: 'c1', companyName: 'Al Rashid Holdings' }]
      const r = await axiosClient.get('/api/client/get/short-info', {
        params: { pageNumber: 0, pageSize: 50, searchText: clientSearch || undefined },
      })
      return r.data?.data?.content ?? r.data?.content ?? []
    },
    enabled: open,
  })

  const { data: matters = [] } = useQuery({
    queryKey: QK.matters.mini(),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: 'm1', title: '260303 — Building Dispute', clientId: 'c1' }]
      const r = await axiosClient.get('/api/matter/get/short-info', { params: { pageNumber: 0, pageSize: 100 } })
      return r.data?.content ?? r.data?.data?.content ?? []
    },
    enabled: open,
  })

  const matterOpts = useMemo(() => {
    const list = (matters as Record<string, string>[]).filter(m => !clientId || m.clientId === clientId || !(m as { client?: { id?: string } }).client || (m as { client?: { id?: string } }).client?.id === clientId)
    return list.map(m => ({ value: m.id, label: m.title ?? m.id }))
  }, [matters, clientId])

  const clientOpts = (clients as Record<string, string>[]).map(c => ({
    value: c.id, label: c.companyName ?? c.name ?? c.id,
  }))

  const { data: lfas = [] } = useQuery({
    queryKey: ['invoice', 'lfas', matterId, clientId],
    queryFn: async () => {
      const r = await axiosClient.get('/api/lfa/filter/page', {
        params: { pageNumber: 0, pageSize: 50, clientId: clientId || undefined },
      })
      return r.data?.data?.content ?? r.data?.content ?? []
    },
    enabled: open && (!!matterId || !!clientId),
  })
  const lfaOpts = (lfas as Record<string, string>[]).map(l => ({
    value: l.id, label: l.agreementNo ?? l.lfaTitle ?? l.id,
  }))

  useQuery({
    queryKey: ['invoice', 'unpaid', matterId],
    queryFn: async () => {
      const list = await billingApi.getUnpaidByMatter(String(matterId))
      setActivities(list)
      if (!isEdit && list.length && selectedActivities.length === 0) {
        const ids = list.map(a => String(a.id ?? a.activityId)).filter(Boolean)
        setSelectedActivities(ids)
        const seeded: ItemRow[] = list.map(a => ({
          name: String(a.activity ?? a.note ?? 'Time entry'),
          rate: Number(a.billing ?? a.rate ?? 0),
          delete: false,
        }))
        replace(seeded)
        void billingApi.calculateHoursMini(
          list.map(a => ({
            hours: a.hours ?? 0,
            minutes: a.minutes ?? 0,
            responsiblePerson: a.responsiblePerson,
            rate: a.rate,
            billingType: a.billingType,
          })),
        ).then(calc => {
          const total = Number((calc as { total?: number })?.total)
          if (Number.isFinite(total) && total > 0 && seeded.length) {
            // keep seeded lines; calc confirms totals
          }
        }).catch(() => undefined)
      }
      return list
    },
    enabled: open && !!matterId,
  })

  function toggleActivity(id: string) {
    setSelectedActivities(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      const seeded = activities
        .filter(a => next.includes(String(a.id ?? a.activityId)))
        .map(a => ({
          name: String(a.activity ?? a.note ?? 'Time entry'),
          rate: Number(a.billing ?? a.rate ?? 0),
          delete: false,
        }))
      if (seeded.length) replace(seeded)
      return next
    })
  }

  const itemsTotal = useMemo(
    () => items.filter(i => !i.delete).reduce((s, i) => s + Number(i.rate || 0), 0),
    [items],
  )
  const discAmt = discountType === 'Amount' ? discountAmount : (itemsTotal * discount) / 100
  const afterDisc = Math.max(0, itemsTotal - discAmt)
  const taxAmt = (afterDisc * tax) / 100
  const finalAmount = afterDisc + taxAmt

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      const relatedId = String(data.matterId || data.clientId || '')
      const payload = {
        matter: data.matterId ? { id: data.matterId } : undefined,
        lfa: data.lfaId ? { id: data.lfaId } : undefined,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        dateOfSupply: data.dateOfSupply || null,
        tax,
        discount: Number(data.discount ?? 0),
        discountAmount: discAmt,
        discountType: data.discountType,
        discountedAmount: discAmt,
        taxableAmount: taxAmt,
        total: itemsTotal,
        paidAmount: itemsTotal,
        finalAmount,
        notes: data.notes,
        note: data.notes,
        activityIds: selectedActivities.length ? selectedActivities : undefined,
        invoiceRelatedToId: relatedId,
        invoiceType: data.matterId ? 'MATTER' : 'CLIENT',
        invoiceBillingType: 'Hourly',
        items: (data.items as ItemRow[]).filter(i => !i.delete).map(i => ({
          name: i.name,
          rate: Number(i.rate),
          delete: false,
        })),
        hourlyRates: [],
        includeActivity: selectedActivities.length > 0,
      }
      if (isEdit) await billingApi.update(String(invoiceId), payload)
      else await billingApi.create(payload)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      onSuccess?.()
      onClose()
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
      title={isEdit ? 'Edit Invoice' : 'Create Invoice'}
      subtitle={isEdit ? 'Update draft invoice details and line items' : 'Generate an invoice from unpaid time logs'}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Save Changes' : 'Create Invoice'}
      width={720}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Client, Matter & Agreement">
        <ControlledAsyncSelect name="clientId" control={control} label="Client" options={clientOpts} onInputChange={setClientSearch} />
        <ControlledAsyncSelect name="matterId" control={control} label="Matter *" options={matterOpts} required />
        <ControlledAsyncSelect name="lfaId" control={control} label="LFA (optional)" options={lfaOpts} />
      </FormSection>

      <FormSection title="Dates">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          <ControlledDatePicker name="issueDate" control={control} label="Issue Date *" required />
          <ControlledDatePicker name="dueDate" control={control} label="Due Date *" required />
          <ControlledDatePicker name="dateOfSupply" control={control} label="Date of Supply" />
        </Box>
      </FormSection>

      {matterId && (
        <FormSection title="Time Logs to Include" description="Select unpaid/approved entries. Lines update from selection.">
          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No unpaid time logs for this matter.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
              {activities.map((a, i) => {
                const id = String(a.id ?? a.activityId)
                const checked = selectedActivities.includes(id)
                return (
                  <Box
                    key={id}
                    onClick={() => toggleActivity(id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                      borderBottom: i < activities.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                      cursor: 'pointer', bgcolor: checked ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Checkbox size="small" checked={checked} onChange={() => toggleActivity(id)} onClick={e => e.stopPropagation()} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{String(a.activity ?? a.note ?? '—')}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(String(a.entryDate ?? ''))}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                      {formatCurrency(Number(a.billing ?? a.rate ?? 0))}
                    </Typography>
                  </Box>
                )
              })}
            </Paper>
          )}
          {selectedActivities.length > 0 && (
            <Chip size="small" label={`${selectedActivities.length} selected`} color="primary" variant="outlined" sx={{ mt: 1 }} />
          )}
        </FormSection>
      )}

      <FormSection title="Line Items">
        {fields.map((field, idx) => (
          <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: 1, mb: 1, alignItems: 'center' }}>
            <ControlledInput name={`items.${idx}.name`} control={control} label="Description" />
            <ControlledInput name={`items.${idx}.rate`} control={control} label="Amount" type="number" />
            <IconButton size="small" onClick={() => remove(idx)} aria-label="Remove item">
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          type="button"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ name: '', rate: 0, delete: false })}
          sx={{ mt: 0.5 }}
        >
          Add line
        </Button>
      </FormSection>

      <FormSection title="Adjustments">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          <ControlledSelect
            name="discountType"
            control={control}
            label="Discount Type"
            options={[
              { value: 'Percentage', label: 'Percentage' },
              { value: 'Amount', label: 'Amount' },
            ]}
          />
          {discountType === 'Amount'
            ? <ControlledInput name="discountAmount" control={control} label="Discount Amount" type="number" />
            : <ControlledInput name="discount" control={control} label="Discount %" type="number" />}
          <ControlledInput name="tax" control={control} label="Tax %" type="number" />
        </Box>
        <ControlledInput name="notes" control={control} label="Notes / Memo" multiline rows={2} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
          <Typography variant="body2" color="text.secondary">Subtotal {formatCurrency(itemsTotal)}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Total {formatCurrency(finalAmount)}</Typography>
        </Box>
      </FormSection>
    </FormDrawer>
  )
}
