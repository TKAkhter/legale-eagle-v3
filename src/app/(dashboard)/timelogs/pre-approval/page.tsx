import { toast } from '@/lib/toast'
import { Box, Typography, Button } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import type { GridParams } from '@/types/common.types'
import { timelogsApi } from '@/api/timelogs'
import { env } from '@/config/env'

const FilterPanel = makeReportFilterPanel({ showUser:true, showMatter:true, showDateRange:true })

async function fetchPreApproval(params: GridParams) {
  if (env.USE_STATIC_DATA) return timelogsApi.getAll(params)
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/activity/for-approval/by-user/v2',{
    params:{...qp, userId:f.userId??'', matterId:f.matterId??'', fromDate:f.fromDate??'', toDate:f.toDate??'', revenueStatus:'INITIAL'}
  })
  return r.data?.data??r.data
}

export default function TimelogsPreApprovalPage() {
  const qc = useQueryClient()

  async function submitForApproval(row: Record<string,unknown>) {
    try {
      await axiosClient.post('/api/activity/send/for/approval/to-attorney/v2',{activityIds:[row.id]})
      toast.success('Submitted for approval')
      qc.invalidateQueries({queryKey:['timelogs','preApproval']})
    } catch { toast.error('Failed to submit') }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:600, mb:2 }}>Timelogs Pre-Approval</Typography>
      <DataGrid
        columns={[
          { field:'activity', header:'Activity' },
          { field:'matter', header:'Matter', renderCell:(v)=>(v as Record<string,string>)?.title??'—' },
          { field:'totalHours', header:'Hours', align:'right' },
          { field:'billing', header:'Amount', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'revenueStatus', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'entryDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
        ]}
        queryKey={['timelogs','preApproval']} queryFn={fetchPreApproval}
        FilterPanel={FilterPanel} hasFilters syncWithUrl
        rowMenuItems={(row)=>[
          { label:'Submit for Approval', icon:<SendIcon fontSize="small"/>, permission:'timelogs:approve', onClick:()=>submitForApproval(row) }
        ]}
      />
    </Box>
  )
}
