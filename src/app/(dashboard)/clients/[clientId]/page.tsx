import { Box, Typography, Paper, Avatar, Chip, Skeleton } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { Tabs } from '@components/ui/Tabs'
import { StatusBadge } from '@components/ui/StatusBadge'
import { DataGrid } from '@components/data-grid/DataGrid'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

export default function ClientDetailPage() {
  const { clientId } = useParams()

  const { data: client, isLoading } = useQuery({
    queryKey: ['clients', 'detail', clientId],
    queryFn: async () => {
      const res = await axiosClient.get('/api/client/get/by/company/' + clientId)
      return res.data?.data ?? res.data
    },
    enabled: !!clientId,
  })

  async function fetchMatters(params: GridParams) {
    const res = await axiosClient.get('/api/matter/list/by/client', { params: { clientId } })
    const list = res.data?.data ?? res.data ?? []
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }

  if (isLoading) return <Skeleton variant="rounded" height={120} />

  const name = client?.companyName || `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim()

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>{name?.[0] ?? '?'}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <StatusBadge status={client?.status ?? 'OPEN'} />
            <Chip size="small" label={client?.clientType ?? 'PERSON'} variant="outlined" />
            {client?.trnNo && <Chip size="small" label={`TRN: ${client.trnNo}`} variant="outlined" />}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">Open Matters</Typography>
          <Typography variant="h6">{client?.openMatter ?? 0}</Typography>
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: 'Matters',
          content: (
            <DataGrid
              columns={[
                { field: 'title', header: 'Matter Title' },
                { field: 'billingType', header: 'Billing', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
                { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
                { field: 'openDate', header: 'Opened', renderCell: (v) => formatDate(String(v ?? '')) },
              ]}
              queryKey={['clients', 'matters', clientId]}
              queryFn={fetchMatters}
              isPaginated={false}
              detailPath={(row) => `/matters/${row.id}`}
            />
          ),
        },
        {
          label: 'Contact Info',
          content: (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography sx={{ mb: 2 }}>{client?.email?.[0]?.emailId ?? '—'}</Typography>
              <Typography variant="body2" color="text.secondary">Phone</Typography>
              <Typography>{client?.phones?.[0]?.phoneNo ?? '—'}</Typography>
            </Paper>
          ),
        },
        {
          label: 'LFAs',
          content: (
            <DataGrid
              columns={[
                { field: 'agreementNo', header: 'Agreement #' },
                { field: 'billingType', header: 'Type', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
                { field: 'fixedBillingAmount', header: 'Amount', align: 'right', renderCell: (v) => v ? formatCurrency(Number(v)) : '—' },
                { field: 'current', header: 'Status', renderCell: (v) => <StatusBadge status={v ? 'Approved' : 'Draft'} /> },
              ]}
              queryKey={['clients', 'lfa', clientId]}
              queryFn={async (_p) => {
                const r = await axiosClient.get('/api/lfa/get/client', { params: { clientId } })
                const list = r.data?.data ?? r.data ?? []
                const arr = Array.isArray(list) ? list : [list].filter(Boolean)
                return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
              }}
              isPaginated={false}
              detailPath={(row) => `/lfa/${row.id}`}
            />
          ),
        },
        { label: 'Documents', content: <Typography color="text.secondary" sx={{ p: 2 }}>Documents are managed via OneDrive. Configure under Integrations → OneDrive.</Typography> },
      ]} />
    </Box>
  )
}
