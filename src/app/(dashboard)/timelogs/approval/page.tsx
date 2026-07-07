import { Box, Typography, Button, Snackbar, Alert } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
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

const FilterPanel = makeReportFilterPanel({ showUser:true, showDepartment:true, showDateRange:true })

async function fetchForApproval(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/activity/for-approval',{
    params:{...qp, userId:f.userId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function TimelogsApprovalPage() {
  const qc = useQueryClient()
  const [snack,setSnack] = useState<{open:boolean;msg:string;severity:'success'|'error'}>({open:false,msg:'',severity:'success'})

  async function handleAction(row: Record<string,unknown>, approve: boolean) {
    try {
      await axiosClient.post('/api/activity/approve',{ activityId:row.id, status: approve?'APPROVED':'REJECTED' })
      setSnack({open:true,msg:approve?'Approved':'Rejected',severity:'success'})
      qc.invalidateQueries({queryKey:['timelogs','approval']})
    } catch { setSnack({open:true,msg:'Action failed',severity:'error'}) }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:600, mb:2 }}>Timelogs Approval (HOD)</Typography>
      <DataGrid
        columns={[
          { field:'activity', header:'Activity' },
          { field:'matter', header:'Matter', renderCell:(v)=>(v as Record<string,string>)?.title??'—' },
          { field:'responsiblePerson', header:'By', renderCell:(v)=>{ const u=v as Record<string,string>; return u?`${u.firstName??''} ${u.lastName??''}`.trim():'—' } },
          { field:'totalHours', header:'Hours', align:'right' },
          { field:'billing', header:'Amount', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'revenueStatus', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'entryDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
        ]}
        queryKey={['timelogs','approval']} queryFn={fetchForApproval}
        FilterPanel={FilterPanel} hasFilters syncWithUrl
        hasRowSelection
        bulkActions={[{
          label: 'Approve Selected',
          onClick: async (rows) => {
            try {
              await axiosClient.post('/api/activity/approve', { activityIds: rows.map(r => r.id), status: 'APPROVED' })
              qc.invalidateQueries({ queryKey: ['timelogs','approval'] })
              setSnack({ open:true, msg:`${rows.length} entries approved`, severity:'success' })
            } catch { setSnack({ open:true, msg:'Bulk approval failed', severity:'error' }) }
          }
        }]}
        rowMenuItems={(row)=>[
          { label:'Approve', icon:<CheckIcon fontSize="small"/>, permission:'timelogs:approve', onClick:()=>handleAction(row,true) },
          { label:'Reject',  icon:<CloseIcon fontSize="small"/>,  permission:'timelogs:approve', color:'error', onClick:()=>handleAction(row,false) },
        ]}
      />
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
