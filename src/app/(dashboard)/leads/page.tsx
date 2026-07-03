import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { useQueryClient } from '@tanstack/react-query'
import { buildQueryParams, buildPostWithQuery } from '@lib/utils/buildQueryParams'
import { getLeadsColumns } from './_components/LeadsColumns'
import { LeadsFilterPanel } from './_components/LeadsFilterPanel'
import type { GridParams } from '@/types/common.types'
import { LeadFormDrawer } from './_components/LeadFormDrawer'
import { useState } from 'react'

async function fetchLeads(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize', queryFilterKeys: ['firstName','pa','status','fromDate','toDate','sortBy','sortDirection','pageNumber','pageSize'] })
  const { params: qParams, data: body } = buildPostWithQuery(
    { ...qp, ...params.filters, pa: '', firstName: params.filters?.firstName ?? '' },
    { queryKeys: ['firstName','pa','status','fromDate','toDate','sortBy','sortDirection','pageNumber','pageSize'], bodyKeys: ['attorneyIds','departmentIds','procuredByIds'] }
  )
  const res = await axiosClient.post('/api/leads/list/filter', body, { params: qParams })
  return res.data?.data ?? res.data
}

export default function LeadsPage() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<string | undefined>()
  const qc = useQueryClient()

  function openCreate() { setEditLeadId(undefined); setDrawerOpen(true) }
  function openEdit(id: string) { setEditLeadId(id); setDrawerOpen(true) }

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Leads</Typography>
        <Can do={PERMISSIONS.LEADS_CREATE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Lead</Button>
        </Can>
      </Box>
      <DataGrid
        columns={getLeadsColumns()}
        queryKey={['leads','list']}
        queryFn={fetchLeads}
        FilterPanel={LeadsFilterPanel}
        hasFilters hasExport hasRowSelection syncWithUrl
        detailPath={(row) => `/leads/${row.id}`}
        rowMenuItems={(row) => [
          { label: 'Edit', icon: <EditIcon fontSize="small" />, permission: PERMISSIONS.LEADS_EDIT, onClick: () => openEdit(String(row.id)) },
        ]}
        defaultSortBy="createdAt" defaultSortDir="desc"
      />
      <LeadFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        leadId={editLeadId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['leads', 'list'] })}
      />
    </Box>
  )
}
