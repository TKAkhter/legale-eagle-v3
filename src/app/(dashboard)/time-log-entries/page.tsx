import { PageShell } from '@/components/ui/PageShell'
import { Box, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { UserSelectFilter } from '@components/filters/UserSelectFilter'
import { MatterSelectFilter } from '@components/filters/MatterSelectFilter'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { DateRangeFilter } from '@components/filters/DateRangeFilter'
import type { FilterPanelProps } from '@components/data-grid/types'
import { ActivityFormDrawer } from './_components/ActivityFormDrawer'
import type { GridParams } from '@/types/common.types'
import { timelogsApi } from '@/api/timelogs'

function TimeLogFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <UserSelectFilter value={String(f.userId ?? '')} onChange={v => set('userId', v)} label="User" />
      <MatterSelectFilter value={String(f.matterId ?? '') || undefined} onChange={v => set('matterId', v)} />
      <ClientSelectFilter value={String(f.clientId ?? '') || undefined} onChange={v => set('clientId', v)} />
      <DateRangeFilter fromDate={String(f.fromDate ?? '')} toDate={String(f.toDate ?? '')} onChange={v => setF(p => ({ ...p, ...v }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function TimeLogEntriesPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [activityType, setActivityType] = useState<'Time' | 'Expense' | 'Fixed'>('Time')
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    const cat = String(searchParams.get('category') ?? 'Matter').toLowerCase()
    setActivityType(cat === 'expense' ? 'Expense' : 'Time')
    setModalOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <PageShell
      title="Time Entries"
      description="Billable time log entries"
      action={(
        <Can do={PERMISSIONS.TIMELOGS_CREATE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Log Time</Button>
        </Can>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'activity', header: 'Activity' },
          {
            field: 'matterMini',
            header: 'Matter',
            renderCell: (v, row) => {
              const m = (v ?? (row as Record<string, unknown>).matter) as Record<string, string> | null
              return m?.title ?? String(m ?? '—')
            },
          },
          {
            field: 'client',
            header: 'Client',
            renderCell: (v) => {
              const c = v as Record<string,string> | null
              return c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
            },
          },
          {
            field: 'responsiblePersonName',
            header: 'User',
            renderCell: (v, row) => {
              if (typeof v === 'string' && v) return v
              const u = (v ?? (row as Record<string, unknown>).responsiblePerson) as Record<string,string> | null
              return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—' : '—'
            },
          },
          { field: 'billingType', header: 'Type', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          {
            field: 'totalHours',
            header: 'Hours',
            align: 'right',
            renderCell: (v, row) => {
              if (v != null && v !== '') return Number(v).toFixed(2)
              const r = row as Record<string, unknown>
              const h = Number(r.hours ?? 0)
              const m = Number(r.minutes ?? 0)
              return h || m ? `${h}:${String(m).padStart(2, '0')}` : '0.00'
            },
          },
          { field: 'billing', header: 'Amount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'revenueStatus', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          {
            field: 'entryDate',
            header: 'Date',
            renderCell: (v, row) => formatDate(String(v ?? (row as Record<string, unknown>).createdAt ?? '')),
          },
        ]}
        queryKey={['activities', 'list']}
        queryFn={(p: GridParams) => timelogsApi.getReport(p)}
        FilterPanel={TimeLogFilterPanel}
        detailPath={(row) => `/time-log-entries/${(row as Record<string,string>).id}`}
        hasFilters
        hasExport
        hasRowSelection
        syncWithUrl
        defaultSortBy="entryDate"
        defaultSortDir="desc"
      />
      <ActivityFormDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultActivityType={activityType}
        onSuccess={() => {
          setModalOpen(false)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ['activities', 'list'] })
        }}
      />
    </PageShell>
  )
}
