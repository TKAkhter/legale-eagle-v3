import { Box, Typography, Paper, Chip, Skeleton, Button } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { Tabs } from '@components/ui/Tabs'
import { StatusBadge } from '@components/ui/StatusBadge'
import { DataGrid } from '@components/data-grid/DataGrid'
import { formatDate, formatDateTime } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { useStopwatchStore } from '@lib/store/stopwatchStore'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import { ActivityFormDrawer } from '../../time-log-entries/_components/ActivityFormDrawer'
import { useState } from 'react'
import type { GridParams } from '@/types/common.types'

export default function MatterDetailPage() {
  const { matterId } = useParams()
  const startStopwatch = useStopwatchStore(s => s.start)
  const [logTimeOpen, setLogTimeOpen] = useState(false)

  const { data: matter, isLoading } = useQuery({
    queryKey: ['matters', 'detail', matterId],
    queryFn: async () => {
      const res = await axiosClient.post('/api/matter/get/by/id', null, { params: { matterId } })
      return res.data?.data ?? res.data
    },
    enabled: !!matterId,
  })

  async function fetchActivities(_p: GridParams) {
    const res = await axiosClient.get('/api/activity/get/by/Matter', { params: { matterId } })
    const list = res.data?.data ?? res.data ?? []
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }

  async function fetchHearings(_p: GridParams) {
    const res = await axiosClient.get('/api/hearing/get', { params: { matterId } })
    const list = res.data?.data ?? res.data ?? []
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }

  async function fetchTasks(_p: GridParams) {
    const res = await axiosClient.get('/api/task/get/full/task', { params: { eventType: 'MATTER', eventTypeId: matterId } })
    const list = res.data?.data ?? res.data ?? []
    return { content: Array.isArray(list) ? list : [list].filter(Boolean), totalElements: 1, totalPages: 1, number: 0, size: 1, first: true, last: true, empty: !list }
  }

  if (isLoading) return <Skeleton variant="rounded" height={140} />

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{matter?.title ?? 'Matter'}</Typography>
            <Typography variant="body2" color="text.secondary">{matter?.matterSequence}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <StatusBadge status={matter?.status ?? 'OPEN'} />
              <Chip size="small" label={matter?.billingType ?? '—'} variant="outlined" />
              <Chip size="small" label={matter?.practiceAreaName ?? '—'} variant="outlined" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<PlayArrowIcon />}
              onClick={() => startStopwatch(matterId!, matter?.title ?? '')}>
              Start Timer
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => setLogTimeOpen(true)}>
              Log Time
            </Button>
          </Box>
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: 'Time Logs',
          content: (
            <DataGrid
              columns={[
                { field: 'activity', header: 'Activity' },
                { field: 'responsiblePerson', header: 'By', renderCell: (v) => { const u = v as Record<string,string>; return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—' } },
                { field: 'totalHours', header: 'Hours', align: 'right' },
                { field: 'billing', header: 'Billing', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
                { field: 'entryDate', header: 'Date', renderCell: (v) => formatDate(String(v ?? '')) },
              ]}
              queryKey={['matters', 'activities', matterId]}
              queryFn={fetchActivities}
              isPaginated={false}
            />
          ),
        },
        {
          label: 'Hearings',
          content: (
            <DataGrid
              columns={[
                { field: 'caseNo', header: 'Case No' },
                { field: 'hearingDate', header: 'Date', renderCell: (v) => formatDate(String(v ?? '')) },
                { field: 'hearingTime', header: 'Time' },
                { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
              ]}
              queryKey={['matters', 'hearings', matterId]}
              queryFn={fetchHearings}
              isPaginated={false}
            />
          ),
        },
        {
          label: 'Tasks',
          content: (
            <DataGrid
              columns={[
                { field: 'taskName', header: 'Task' },
                { field: 'taskDeadLine', header: 'Deadline', renderCell: (v) => formatDate(String(v ?? '')) },
                { field: 'priority', header: 'Priority' },
              ]}
              queryKey={['matters', 'tasks', matterId]}
              queryFn={fetchTasks}
              isPaginated={false}
            />
          ),
        },
        {
          label: 'Invoices',
          content: (
            <DataGrid
              columns={[
                { field: 'invoiceNo', header: 'Invoice #' },
                { field: 'taxableAmount', header: 'Amount', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
                { field: 'paidAmount', header: 'Paid', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
                { field: 'invoiceStatus', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
                { field: 'dueDate', header: 'Due', renderCell: (v) => formatDate(String(v ?? '')) },
              ]}
              queryKey={['matters', 'invoices', matterId]}
              queryFn={async (_p) => {
                const res = await axiosClient.post('/api/invoice/filter/all/v2', {}, { params: { matterId, invoiceStatus: 'All', pageNumber: 0, pageSize: 100 } })
                const list = res.data?.data?.content ?? res.data?.content ?? []
                return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
              }}
              isPaginated={false}
              detailPath={(row) => `/billings/${row.id}`}
            />
          ),
        },
        { label: 'Documents', content: <Typography color="text.secondary" sx={{ p: 2 }}>Documents are stored in OneDrive. Configure the integration under Integrations → OneDrive.</Typography> },
      ]} />
      <ActivityFormDrawer
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        prefillMatterId={matterId}
        onSuccess={() => setLogTimeOpen(false)}
      />
    </Box>
  )
}
