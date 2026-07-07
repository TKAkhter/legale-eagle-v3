import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Box, Typography, Checkbox, Paper, Chip } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { QK } from '@lib/query/keys'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'

interface Props { open: boolean; onClose: () => void; onSuccess?: () => void }

export function InvoiceFormDrawer({ open, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])

  const { control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      matterId:  '',
      lfaId:     '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate:   new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      tax:       '5',
      discount:  '0',
      notes:     '',
    },
  })

  const matterId = watch('matterId')

  useEffect(() => { if (!open) { reset(); setSelectedActivities([]); setActivities([]) } }, [open, reset])

  useQuery({
    queryKey: ['invoice', 'activities', matterId],
    queryFn: async () => {
      const res = await axiosClient.post('/api/report/activity/filter/m/v3', {}, {
        params: { matterId, revenueStatus: 'APPROVED', pageNumber: 0, pageSize: 200 },
      })
      const list = res.data?.data?.content ?? res.data?.content ?? []
      setActivities(list)
      return list
    },
    enabled: !!matterId,
  })

  const { data: matters = [] } = useQuery({
    queryKey: QK.matters.mini(),
    queryFn: async () => {
      const r = await axiosClient.get('/api/matter/get/short-info', { params: { pageNumber: 0, pageSize: 100 } })
      return r.data?.content ?? r.data?.data?.content ?? []
    },
  })

  const { data: lfas = [] } = useQuery({
    queryKey: ['invoice', 'lfas', matterId],
    queryFn: async () => {
      const r = await axiosClient.get('/api/lfa/filter/page', { params: { pageNumber: 0, pageSize: 50 } })
      return r.data?.data?.content ?? r.data?.content ?? []
    },
    enabled: !!matterId,
  })

  const matterOpts = (matters as Record<string, string>[]).map(m => ({ value: m.id, label: m.title ?? m.id }))
  const lfaOpts    = (lfas    as Record<string, string>[]).map(l => ({ value: l.id, label: l.agreementNo ?? l.lfaTitle ?? l.id }))

  function toggleActivity(id: string) {
    setSelectedActivities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function onSubmit(data: Record<string, unknown>) {
    await axiosClient.post('/api/invoice/add', {
      matter:      { id: data.matterId },
      lfa:         data.lfaId ? { id: data.lfaId } : undefined,
      issueDate:   data.issueDate,
      dueDate:     data.dueDate,
      tax:         Number(data.tax ?? 5),
      discount:    Number(data.discount ?? 0),
      notes:       data.notes,
      activityIds: selectedActivities.length ? selectedActivities : undefined,
    })
    qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
    onSuccess?.()
    onClose()
  }

  const totalSelected = activities
    .filter(a => selectedActivities.includes(String(a.id)))
    .reduce((sum, a) => sum + Number(a.billing ?? 0), 0)

  return (
    <FormDrawer open={open} onClose={onClose} title="Create Invoice"
      subtitle="Generate an invoice from approved time logs"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel="Create Invoice" width={600}>

      <FormSection title="Matter & Agreement">
        <ControlledAsyncSelect name="matterId" control={control} label="Matter *" options={matterOpts} required />
        <ControlledAsyncSelect name="lfaId"    control={control} label="LFA (optional)" options={lfaOpts} />
      </FormSection>

      <FormSection title="Dates">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledDatePicker name="issueDate" control={control} label="Issue Date *" required />
          <ControlledDatePicker name="dueDate"   control={control} label="Due Date *" required />
        </Box>
      </FormSection>

      <FormSection title="Adjustments">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <ControlledInput name="tax"      control={control} label="Tax (%)"      type="number" />
          <ControlledInput name="discount" control={control} label="Discount (%)" type="number" />
        </Box>
        <ControlledInput name="notes" control={control} label="Notes / Memo" multiline rows={2} />
      </FormSection>

      {matterId && (
        <FormSection title="Time Logs to Include" description="Select approved entries to include. Leave blank for a manual invoice.">
          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No approved time logs for this matter.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
              {activities.map((a, i) => {
                const id = String(a.id)
                const checked = selectedActivities.includes(id)
                return (
                  <Box key={id} onClick={() => toggleActivity(id)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                      borderBottom: i < activities.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                      cursor: 'pointer', bgcolor: checked ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' } }}>
                    <Checkbox size="small" checked={checked} onChange={() => toggleActivity(id)} onClick={e => e.stopPropagation()} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{String(a.activity ?? '—')}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(String(a.entryDate ?? ''))}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>{formatCurrency(Number(a.billing ?? 0))}</Typography>
                  </Box>
                )
              })}
            </Paper>
          )}
          {selectedActivities.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
              <Chip size="small" label={`${selectedActivities.length} selected`} color="primary" variant="outlined" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Subtotal: {formatCurrency(totalSelected)}</Typography>
            </Box>
          )}
        </FormSection>
      )}
    </FormDrawer>
  )
}
