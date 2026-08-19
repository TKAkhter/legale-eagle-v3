import { toast } from '@/lib/toast'
import { Box, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'
import { env } from '@/config/env'
import { taskApprovals as staticTaskApprovals } from '@/data/static'

async function fetchTaskApprovals(_p: GridParams) {
  if (env.USE_STATIC_DATA) { const list = staticTaskApprovals; return { content:list, totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 } }
  const r = await axiosClient.get('/api/task/get/type/approval')
  const list = r.data?.data??r.data??[]
  return { content:list, totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 }
}

export default function TaskApprovalPage() {
  const qc = useQueryClient()
  

  async function handleAction(row: Record<string,unknown>, approve: boolean) {
    try {
      if (!env.USE_STATIC_DATA) await axiosClient.post('/api/task/approve',{ taskId:row.id, status: approve?'Completed':'Rejected' })
      toast.success(approve ? 'Task approved' : 'Task rejected')
      qc.invalidateQueries({queryKey:['tasks','approval']})
    } catch { toast.error('Action failed') }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:600, mb:2 }}>Task Approvals</Typography>
      <DataGrid
        columns={[
          { field:'taskName', header:'Task' },
          { field:'taskType', header:'Related To' },
          { field:'assignedTo', header:'Assigned', renderCell:(v)=>{ const u=v as Record<string,string>; return u?`${u.firstName??''} ${u.lastName??''}`.trim():'—' } },
          { field:'taskDeadLine', header:'Deadline', renderCell:(v)=>formatDate(String(v??'')) },
          { field:'taskStatus', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
        ]}
        queryKey={['tasks','approval']} queryFn={fetchTaskApprovals} isPaginated={false}
        rowMenuItems={(row)=>[
          { label:'Approve', icon:<CheckIcon fontSize="small"/>, onClick:()=>handleAction(row,true) },
          { label:'Reject', icon:<CloseIcon fontSize="small"/>, color:'error', onClick:()=>handleAction(row,false) },
        ]}
      />
    </Box>
  )
}
