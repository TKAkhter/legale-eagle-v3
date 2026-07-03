import { Box, Typography, Button, Snackbar, Alert } from '@mui/material'
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

const FilterPanel = makeReportFilterPanel({ showUser:true, showMatter:true, showDateRange:true })

async function fetchPreApproval(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/activity/for-approval/by-user/v2',{
    params:{...qp, userId:f.userId??'', matterId:f.matterId??'', fromDate:f.fromDate??'', toDate:f.toDate??'', revenueStatus:'INITIAL'}
  })
  return r.data?.data??r.data
}

export default function TimelogsPreApprovalPage() {
  const qc = useQueryClient()
  const [snack,setSnack] = useState<{open:boolean;msg:string;severity:'success'|'error'}>({open:false,msg:'',severity:'success'})

  async function submitForApproval(row: Record<string,unknown>) {
    try {
      await axiosClient.post('/api/activity/send/for/approval/to-attorney/v2',{activityIds:[row.id]})
      setSnack({open:true,msg:'Submitted for approval',severity:'success'})
      qc.invalidateQueries({queryKey:['timelogs','preApproval']})
    } catch { setSnack({open:true,msg:'Failed to submit',severity:'error'}) }
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
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
