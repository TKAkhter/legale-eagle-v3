import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { BillingTypeFilter } from '@components/filters/BillingTypeFilter'
import { useState } from 'react'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'
import { lfaApi } from '@/api/lfa'
import { env } from '@/config/env'
import { LfaFormDrawer } from './_components/LfaFormDrawer'
import { useQueryClient } from '@tanstack/react-query'

async function fetchLfas(params: GridParams) {
  if (env.USE_STATIC_DATA) return lfaApi.getAll(params)
  const qp = buildQueryParams(params, { paginationConvention:'pageNumber-pageSize' })
  const f = params.filters??{}
  const res = await axiosClient.get('/api/lfa/filter/page',{
    params:{...qp, clientId:f.clientId??'', billingType:f.billingType??'', lfaId:'', referralId:'', fromDate:'', toDate:''},
  })
  return res.data?.data??res.data
}

function LfaFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f,setF] = useState<Record<string,unknown>>(filters)
  const set = (k:string,v:unknown) => setF(p=>({...p,[k]:v}))
  return (
    <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, alignItems:'flex-end' }}>
      <ClientSelectFilter value={String(f.clientId??'')} onChange={v=>set('clientId',v)} />
      <BillingTypeFilter  value={String(f.billingType??'')} onChange={v=>set('billingType',v)} />
      <Box sx={{ display:'flex', gap:1 }}>
        <Button variant="contained" size="small" onClick={()=>onSearch(f)}>Search</Button>
        <Button size="small" onClick={()=>{setF({});onReset()}}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function LfaPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>LFA — Legal Fee Agreements</Typography>
        <Can do={PERMISSIONS.LFA_CREATE}><Button variant="contained" startIcon={<AddIcon/>} onClick={()=>setDrawerOpen(true)}>New LFA</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field:'agreementNo', header:'Agreement #' },
          { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
          { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'fixedBillingAmount', header:'Fixed Amount', align:'right', renderCell:(v)=>v?formatCurrency(Number(v)):'—' },
          { field:'contingent', header:'Contingent', align:'right', renderCell:(v)=>v?`${v}%`:'—' },
          { field:'agreementDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
          { field:'current', header:'Status', renderCell:(v)=><StatusBadge status={v?'Approved':'Draft'} /> },
        ]}
        queryKey={['lfa','list']}
        queryFn={fetchLfas}
        FilterPanel={LfaFilterPanel}
        hasFilters hasExport syncWithUrl
        detailPath={(row)=>`/lfa/${row.id}`}
      />
      <LfaFormDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} onSuccess={()=>qc.invalidateQueries({queryKey:['lfa','list']})} />
    </Box>
  )
}
