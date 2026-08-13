import { env } from '@/config/env'
import { costCards as static_costCards } from '@/data/static'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { DataGrid } from '@components/data-grid/DataGrid'
import { UserSelectFilter } from '@components/filters/UserSelectFilter'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import { useState } from 'react'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'

async function fetchCostCards(params: GridParams) {
  if (env.USE_STATIC_DATA) { const list = static_costCards; return { content:list, totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 } }
  const f = params.filters ?? {}
  const r = await axiosClient.get('/api/user/cost-cards/get', { params: { userId: f.userId ?? '' } })
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

function Filter({ onSearch, filters }: FilterPanelProps) {
  const [uid, setUid] = useState(String(filters.userId ?? ''))
  return <UserSelectFilter value={uid} onChange={v => { setUid(v ?? ''); onSearch({ userId: v }) }} label="Fee Earner" />
}

export default function CostCardsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Cost Cards</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>Add Cost Card</Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Internal cost per hour per fee earner — used in margin erosion and profitability calculations.</Typography>
      <DataGrid
        columns={[
          { field: 'user', header: 'Fee Earner', renderCell: (v) => { const u = v as Record<string, string>; return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—' } },
          { field: 'costPerHour', header: 'Cost/Hour', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'effectiveDate', header: 'Effective From', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'endDate', header: 'Effective To', renderCell: (v) => v ? formatDate(String(v)) : 'Current' },
        ]}
        queryKey={['budgeting', 'costCards']} queryFn={fetchCostCards}
        FilterPanel={Filter} hasFilters isPaginated={false}
        emptyState={<Typography color="text.secondary">Select a fee earner to view their cost cards</Typography>}
      />
    </Box>
  )
}
