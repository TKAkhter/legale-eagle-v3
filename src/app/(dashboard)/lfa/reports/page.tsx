import { env } from '@/config/env'
import { lfaApi } from '@/api/lfa'
import { Box, Typography, Button } from '@mui/material'
import { useState } from 'react'
import { DataGrid } from '@components/data-grid/DataGrid'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { DateRangeFilter } from '@components/filters/DateRangeFilter'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { Tabs } from '@components/ui/Tabs'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'

async function fetchLfaBilling(params: GridParams) {
  if (env.USE_STATIC_DATA) return lfaApi.getAll(params)
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/lfa/billing/v2',{params:{...qp,clientId:f.clientId??'',fromDate:f.fromDate??'',toDate:f.toDate??''}})
  return r.data?.data??r.data
}

async function fetchLfaReferral(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/lfa/referral',{params:{...qp,fromDate:f.fromDate??'',toDate:f.toDate??''}})
  return r.data?.data??r.data
}

function ReportFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f,setF] = useState<Record<string,unknown>>(filters)
  return (
    <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, alignItems:'flex-end' }}>
      <ClientSelectFilter value={String(f.clientId??'')} onChange={v=>setF(p=>({...p,clientId:v}))} />
      <DateRangeFilter fromDate={String(f.fromDate??'')} toDate={String(f.toDate??'')} onChange={v=>setF(p=>({...p,...v}))} />
      <Box sx={{ display:'flex', gap:1 }}>
        <Button variant="contained" size="small" onClick={()=>onSearch(f)}>Apply</Button>
        <Button size="small" onClick={()=>{setF({});onReset()}}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function LfaReportsPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:600, mb:2 }}>LFA Reports</Typography>
      <Tabs tabs={[
        { label:'Billing Report', content:(
          <DataGrid
            columns={[
              { field:'lfaTitle', header:'LFA' },
              { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
              { field:'totalBilled', header:'Billed', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
              { field:'totalPaid', header:'Paid', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
              { field:'balance', header:'Balance', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
            ]}
            queryKey={['reports','lfa','billing']} queryFn={fetchLfaBilling}
            FilterPanel={ReportFilter} hasFilters hasExport syncWithUrl
          />
        )},
        { label:'Referral Report', content:(
          <DataGrid
            columns={[
              { field:'lfaTitle', header:'LFA' },
              { field:'referralName', header:'Referral' },
              { field:'referralPercentage', header:'%', align:'right', renderCell:(v)=>`${v??0}%` },
              { field:'referralAmount', header:'Amount', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
            ]}
            queryKey={['reports','lfa','referral']} queryFn={fetchLfaReferral}
            FilterPanel={ReportFilter} hasFilters hasExport syncWithUrl
          />
        )},
      ]} />
    </Box>
  )
}
