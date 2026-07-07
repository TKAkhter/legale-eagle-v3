import { Box, Typography, Button, Avatar, Chip, Snackbar, Alert } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import LockResetIcon from '@mui/icons-material/LockReset'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { SearchInput } from '@components/filters/SearchInput'
import { DepartmentFilter } from '@components/filters/DepartmentFilter'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { QK } from '@lib/query/keys'
import { InviteUserDrawer } from './_components/InviteUserDrawer'
import { EditUserDrawer } from './_components/EditUserDrawer'
import { ResetPasswordDialog } from './_components/ResetPasswordDialog'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'

async function fetchUsers(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const f = params.filters ?? {}
  const r = await axiosClient.get('/api/user/get', {
    params: { ...qp, searchText: f.searchText ?? '', departmentId: f.departmentId ?? '' },
  })
  return r.data?.data ?? r.data
}

function UsersFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <SearchInput value={String(f.searchText ?? '')} onChange={v => setF(p => ({ ...p, searchText: v }))} placeholder="Search name or email..." />
      <DepartmentFilter value={String(f.departmentId ?? '')} onChange={v => setF(p => ({ ...p, departmentId: v }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [inviteOpen,    setInviteOpen]    = useState(false)
  const [editUserId,    setEditUserId]    = useState<string | null>(null)
  const [resetUser,     setResetUser]     = useState<{ id: string; name: string } | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error' }>({ open: false, msg: '', severity: 'success' })

  async function blockUser(row: Record<string, unknown>) {
    try {
      await axiosClient.put(`/api/user/block/${row.id}`)
      setSnack({ open: true, msg: `User ${row.active ? 'blocked' : 'unblocked'}`, severity: 'success' })
      qc.invalidateQueries({ queryKey: QK.users.list() })
    } catch { setSnack({ open: true, msg: 'Action failed', severity: 'error' }) }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Manage Users</Typography>
        <Can do={PERMISSIONS.USERS_CREATE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setInviteOpen(true)}>Invite User</Button>
        </Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'firstName', header: 'Name', renderCell: (_, row) => {
            const r = row as Record<string, string>
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={r.profilePic} sx={{ width: 28, height: 28, fontSize: 12 }}>{r.firstName?.[0]}</Avatar>
                <span>{r.firstName} {r.lastName}</span>
              </Box>
            )
          }},
          { field: 'email', header: 'Email' },
          { field: 'designation', header: 'Designation', renderCell: (v) => (v as Record<string,string>)?.name ?? '—' },
          { field: 'department',  header: 'Department',  renderCell: (v) => (v as Record<string,string>)?.name ?? '—' },
          { field: 'companyUserType', header: 'Role', renderCell: (v) => <Chip size="small" label={String(v ?? '')} variant="outlined" /> },
          { field: 'active', header: 'Status', renderCell: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
        ]}
        queryKey={[...QK.users.list()]}
        queryFn={fetchUsers}
        FilterPanel={UsersFilterPanel}
        hasFilters syncWithUrl
        rowMenuItems={(row) => [
          { label: 'Edit',           icon: <EditIcon fontSize="small" />,      permission: PERMISSIONS.USERS_EDIT,  onClick: () => setEditUserId(String(row.id)) },
          { label: 'Reset Password', icon: <LockResetIcon fontSize="small" />, permission: PERMISSIONS.USERS_EDIT,  onClick: () => setResetUser({ id: String(row.id), name: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() }) },
          { label: row.active ? 'Block' : 'Unblock', icon: <BlockIcon fontSize="small" />, permission: PERMISSIONS.USERS_BLOCK, color: 'error', onClick: () => blockUser(row) },
        ]}
      />

      <InviteUserDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {editUserId && <EditUserDrawer open={!!editUserId} onClose={() => setEditUserId(null)} userId={editUserId} onSuccess={() => setEditUserId(null)} />}
      {resetUser  && <ResetPasswordDialog open={!!resetUser} onClose={() => setResetUser(null)} userId={resetUser.id} userName={resetUser.name} />}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
