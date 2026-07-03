import { Box, Typography, Snackbar, Alert } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'

async function fetchLfaApprovals(_p: GridParams) {
  const r = await axiosClient.get('/api/lfa/approval/list')
  const list = r.data?.data??r.data??[]
  return { content:list, totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 }
}

export default function LfaApprovalPage() {
  const qc = useQueryClient()
  const [snack,setSnack] = useState<{open:boolean;msg:string;severity:'success'|'error'}>({open:false,msg:'',severity:'success'})

  async function handleAction(row: Record<string,unknown>, status: string) {
    try {
      await axiosClient.patch(`/api/lfa/approve/${row.id}/${status}`)
      setSnack({open:true,msg:`LFA ${status==='Approved'?'approved':'rejected'}`,severity:'success'})
      qc.invalidateQueries({queryKey:['lfa','approval']})
    } catch { setSnack({open:true,msg:'Action failed',severity:'error'}) }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:600, mb:2 }}>LFA Approvals</Typography>
      <DataGrid
        columns={[
          { field:'agreementNo', header:'Agreement #' },
          { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
          { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'agreementDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
          { field:'status', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'Approval')} /> },
        ]}
        queryKey={['lfa','approval']} queryFn={fetchLfaApprovals} isPaginated={false}
        rowMenuItems={(row)=>[
          { label:'Approve', icon:<CheckIcon fontSize="small"/>, permission:'lfa:approve', onClick:()=>handleAction(row,'Approved') },
          { label:'Reject',  icon:<CloseIcon  fontSize="small"/>, permission:'lfa:approve', color:'error', onClick:()=>handleAction(row,'Canceled') },
        ]}
      />
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
