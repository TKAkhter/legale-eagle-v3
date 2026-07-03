import { Box, Typography, Avatar } from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { SearchInput } from '@components/filters/SearchInput'
import { DepartmentFilter } from '@components/filters/DepartmentFilter'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { useState } from 'react'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'

async function fetchTeam(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const f = params.filters ?? {}
  const r = await axiosClient.get('/api/user/get', { params: { ...qp, searchText: f.searchText ?? '', departmentId: f.departmentId ?? '' } })
  return r.data?.data ?? r.data
}

function TeamFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <SearchInput value={String(f.searchText ?? '')} onChange={v => { setF(p => ({ ...p, searchText: v })); onSearch({ ...f, searchText: v }) }} placeholder="Search team member..." />
      <DepartmentFilter value={String(f.departmentId ?? '')} onChange={v => { setF(p => ({ ...p, departmentId: v })); onSearch({ ...f, departmentId: v }) }} />
    </Box>
  )
}

export default function TeamPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>My Team</Typography>
      <DataGrid
        columns={[
          { field: 'firstName', header: 'Name', renderCell: (_, row) => {
            const r = row as Record<string, string>
            return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar src={r.profilePic} sx={{ width: 28, height: 28, fontSize: 12 }}>{r.firstName?.[0]}</Avatar><span>{r.firstName} {r.lastName}</span></Box>
          }},
          { field: 'email', header: 'Email' },
          { field: 'designation', header: 'Designation', renderCell: (v) => (v as Record<string, string>)?.name ?? '—' },
          { field: 'department', header: 'Department', renderCell: (v) => (v as Record<string, string>)?.name ?? '—' },
          { field: 'companyUserType', header: 'Role' },
          { field: 'active', header: 'Status', renderCell: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
        ]}
        queryKey={['team', 'list']} queryFn={fetchTeam}
        FilterPanel={TeamFilter} hasFilters syncWithUrl
      />
    </Box>
  )
}
