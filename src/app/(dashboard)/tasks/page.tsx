import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import ViewListIcon   from '@mui/icons-material/ViewList'
import { TaskKanban } from './_components/TaskKanban'
import { Box, Typography, Button, Chip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'
import { tasksApi } from '@/api/tasks'
import { env } from '@/config/env'
import { TaskFormDrawer } from './_components/TaskFormDrawer'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

async function fetchTasks(params: GridParams) {
  if (env.USE_STATIC_DATA) return tasksApi.getAll(params)
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const res = await axiosClient.get('/api/task/get/individual/task/v2', {
    params: { ...qp, eventType: 'ALL', taskStatus: 'Pending', sortBy: qp.sortBy, sortDir: qp.sortDirection },
  })
  return res.data?.data ?? res.data
}

export default function TasksPage() {
  const [view, setView] = useState<'list'|'board'>('list')
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Tasks</Typography>
        <Can do={PERMISSIONS.TASKS_CREATE}><Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>New Task</Button></Can>
      </Box>
      {view === 'board' ? (
        <TaskKanban tasks={[]} onAddTask={()=>{setEditId(undefined);setDrawerOpen(true)}} />
      ) : (
      <DataGrid
        columns={[
          { field: 'taskName', header: 'Task' },
          { field: 'taskType', header: 'Related To' },
          { field: 'priority', header: 'Priority', renderCell: (v) => {
            const color = v === 'High' ? 'error' : v === 'Low' ? 'default' : 'warning'
            return <Chip size="small" label={String(v ?? 'Normal')} color={color as 'error'|'warning'|'default'} variant="outlined" />
          }},
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
      )}
      <TaskFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} taskId={editId}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['tasks','list'] }); setDrawerOpen(false) }} />
    </Box>
  )
}
