import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { StatusBadge } from '@components/ui/StatusBadge'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { SearchInput } from '@components/filters/SearchInput'
import { useState } from 'react'
import type { GridParams } from '@/types/common.types'
import { ClientFormDrawer } from './_components/ClientFormDrawer'
import { useQueryClient } from '@tanstack/react-query'

async function fetchClients(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const res = await axiosClient.get('/api/client/get/short-info', { params: { ...qp, clientName: params.filters?.clientName ?? '' } })
  return res.data?.data ?? res.data
}

function ClientsFilterPanel({ onSearch, filters }: { onSearch: (f: Record<string, unknown>) => void; onReset: () => void; filters: Record<string, unknown> }) {
  const [name, setName] = useState(String(filters.clientName ?? ''))
  return <SearchInput value={name} onChange={(v) => { setName(v); onSearch({ clientName: v }) }} placeholder="Search client name..." />
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Clients</Typography>
        <Can do={PERMISSIONS.CLIENTS_CREATE}><Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>New Client</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'companyName', header: 'Client', renderCell: (_, row) => (row as Record<string,string>).companyName || `${(row as Record<string,string>).firstName ?? ''} ${(row as Record<string,string>).lastName ?? ''}`.trim() },
          { field: 'clientType', header: 'Type' },
          { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? 'OPEN')} /> },
          { field: 'openMatter', header: 'Open Matters', align: 'right' },
          { field: 'lfaCount', header: 'LFAs', align: 'right' },
        ]}
        queryKey={['clients', 'list']}
        queryFn={fetchClients}
        FilterPanel={ClientsFilterPanel}
        hasFilters hasExport syncWithUrl
        detailPath={(row) => `/clients/${row.id}`}
        rowMenuItems={(row) => [
          { label: 'Edit', icon: <></>, permission: 'clients:edit', onClick: () => { setEditId(String(row.id)); setDrawerOpen(true) } },
        ]}
      />
      <ClientFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} clientId={editId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['clients','list'] })} />
    </Box>
  )
}
