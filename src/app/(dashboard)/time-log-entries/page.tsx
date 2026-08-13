import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
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
import { env } from '@/config/env'

async function fetchTimeLogs(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const res = await axiosClient.post('/api/report/activity/filter/m/v3', {}, {
    params: { ...qp, ...params.filters, pageNumber: qp.pageNumber, pageSize: qp.pageSize },
  })
  return res.data?.data ?? res.data
}

function TimeLogFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <UserSelectFilter value={String(f.userId ?? '')} onChange={v => set('userId', v)} label="User" />
      <MatterSelectFilter value={String(f.matterId ?? '')} onChange={v => set('matterId', v)} />
      <ClientSelectFilter value={String(f.clientId ?? '')} onChange={v => set('clientId', v)} />
      <DateRangeFilter fromDate={String(f.fromDate ?? '')} toDate={String(f.toDate ?? '')} onChange={v => setF(p => ({ ...p, ...v }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function TimeLogEntriesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Time Log Entries</Typography>
        <Can do={PERMISSIONS.TIMELOGS_CREATE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Log Time</Button>
        </Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'activity', header: 'Activity' },
          { field: 'matter', header: 'Matter', renderCell: (v) => (v as Record<string,string>)?.title ?? '—' },
          { field: 'responsiblePerson', header: 'User', renderCell: (v) => { const u = v as Record<string,string>; return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—' } },
          { field: 'billingType', header: 'Type', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          { field: 'totalHours', header: 'Hours', align: 'right' },
          { field: 'billing', header: 'Amount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'revenueStatus', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
          { field: 'entryDate', header: 'Date', renderCell: (v) => formatDate(String(v ?? '')) },
        ]}
        queryKey={['activities', 'list']}
        queryFn={fetchTimeLogs}
        FilterPanel={TimeLogFilterPanel}
        hasFilters hasExport hasRowSelection syncWithUrl
        defaultSortBy="entryDate" defaultSortDir="desc"
      />
      <ActivityFormDrawer open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={() => setModalOpen(false)} />
    </Box>
  )
}
