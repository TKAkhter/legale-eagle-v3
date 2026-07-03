import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { StatusBadge } from '@components/ui/StatusBadge'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'
import { MatterFormDrawer } from './_components/MatterFormDrawer'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import EditIcon from '@mui/icons-material/Edit'

async function fetchMatters(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const res = await axiosClient.post('/api/report/matter/mini/filter/page/v2',
    params.filters?.matterMiniFilterDto ?? {},
    { params: { ...qp, billingType:'', client:'', departmentName:'', fromDate:'', lfa:'', lastActivityFromDate:'', lastActivityToDate:'', matterCloseFromDate:'', matterCloseToDate:'', matterId:'', partyOpposing:'', practiceArea:'', scope:'', status: params.filters?.status ?? '', toDate:'' } }
  )
  return res.data?.data ?? res.data
}

export default function MattersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Matters</Typography>
        <Can do={PERMISSIONS.MATTERS_CREATE}><Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>New Matter</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'title', header: 'Title', sortKey: 'title' },
          { field: 'matterSequence', header: 'Ref #' },
          { field: 'client', header: 'Client', renderCell: (v) => { const c = v as Record<string,string>; return c?.companyName ?? c?.firstName ?? '—' } },
          { field: 'billingType', header: 'Type', renderCell: (v) => <StatusBadge status={String(v??'')} /> },
          { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v??'')} /> },
          { field: 'openDate', header: 'Opened', renderCell: (v) => formatDate(String(v??'')) },
        ]}
        queryKey={['matters','list']}
        queryFn={fetchMatters}
        hasFilters hasExport syncWithUrl
        detailPath={(row) => `/matters/${row.id}`}
        rowMenuItems={(row) => [
          { label: 'Edit', icon: <EditIcon fontSize="small" />, permission: 'matters:edit', onClick: () => { setEditId(String(row.id)); setDrawerOpen(true) } },
        ]}
        defaultSortBy="createdAt" defaultSortDir="desc"
      />
      <MatterFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} matterId={editId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['matters','list'] })} />
    </Box>
  )
}
