import { Box, Typography } from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { getLeadsColumns } from '../leads/_components/LeadsColumns'
import { LeadsFilterPanel } from '../leads/_components/LeadsFilterPanel'
import type { GridParams } from '@/types/common.types'
import { leadsApi } from '@/api/leads'
import { env } from '@/config/env'

async function fetchMyLeads(params: GridParams) {
  if (env.USE_STATIC_DATA) return leadsApi.getAll({ ...params, filters: { ...params.filters, assignedToMe: true } })
  const qp = buildQueryParams(params, { paginationConvention: 'pageNo-pageSize' })
  const res = await axiosClient.get('/api/leads/my', { params: { ...qp, leadType: 'ALL', status: params.filters?.status ?? 'ALL' } })
  return res.data?.data ?? res.data
}

export default function MyLeadsPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>My Leads</Typography>
      <DataGrid
        columns={getLeadsColumns()}
        queryKey={['leads', 'my']}
        queryFn={fetchMyLeads}
        FilterPanel={LeadsFilterPanel}
        hasFilters hasExport syncWithUrl
        detailPath={(row) => `/leads/${row.id}`}
        defaultSortBy="createdAt" defaultSortDir="desc"
      />
    </Box>
  )
}
