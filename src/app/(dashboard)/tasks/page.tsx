import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'
import { TaskFormDrawer } from './_components/TaskFormDrawer'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

async function fetchTasks(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const res = await axiosClient.get('/api/task/get/individual/task/v2', {
    params: { ...qp, eventType: 'ALL', taskStatus: 'Pending', sortBy: qp.sortBy, sortDir: qp.sortDirection },
  })
  return res.data?.data ?? res.data
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Tasks</Typography>
        <Can do={PERMISSIONS.TASKS_CREATE}><Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>New Task</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'taskName', header: 'Task' },
          { field: 'taskType', header: 'Related To' },
          { field: 'priority', header: 'Priority', renderCell: (v) => <StatusBadge status={String(v ?? 'Normal')} /> },
          { field: 'taskDeadLine', header: 'Deadline', renderCell: (v) => formatDate(String(v ?? '')) },
        ]}
        queryKey={['tasks', 'list']}
        queryFn={fetchTasks}
        hasExport syncWithUrl
        detailPath={(row) => `/tasks/${row.id}`}
        rowMenuItems={(row) => [
          { label: 'Edit', icon: <></>, permission: 'tasks:edit', onClick: () => { setEditId(String(row.id)); setDrawerOpen(true) } },
        ]}
      />
      <TaskFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} taskId={editId}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['tasks','list'] }); setDrawerOpen(false) }} />
    </Box>
  )
}
