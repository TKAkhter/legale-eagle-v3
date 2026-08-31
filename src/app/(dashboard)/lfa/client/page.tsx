import { lfaItems as staticLfa } from '@/data/static'
import { PageShell } from '@/components/ui/PageShell'
import { env } from '@/config/env'
import { lfaApi } from '@/api/lfa'
import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { ClientSelectFilter } from '@components/filters/ClientSelectFilter'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import type { FilterPanelProps } from '@components/data-grid/types'
import type { GridParams } from '@/types/common.types'

async function fetchClientLfas(params: GridParams) {
  if (env.USE_STATIC_DATA) { const list = staticLfa; return { content:list as Record<string,unknown>[], totalElements:list.length, totalPages:1, number:0, size:list.length, first:true, last:true, empty:list.length===0 } }
  const clientId = params.filters?.clientId
  if (!clientId) return { content:[], totalElements:0, totalPages:0, number:0, size:0, first:true, last:true, empty:true }
  const r = await axiosClient.get('/api/lfa/get/client',{params:{clientId}})
  const list = r.data?.data??r.data??[]
  const arr = Array.isArray(list)?list:[list].filter(Boolean)
  return { content:arr, totalElements:arr.length, totalPages:1, number:0, size:arr.length, first:true, last:true, empty:arr.length===0 }
}

function ClientLfaFilter({ onSearch, filters }: FilterPanelProps) {
  const [clientId,setClientId] = useState(String(filters.clientId??''))
  return <ClientSelectFilter value={clientId} onChange={v=>{setClientId(v??'');onSearch({clientId:v})}} />
}

export default function ClientLfasPage() {
  return (
    <PageShell title="Client LFAs" description="Fee agreements by client">
      <DataGrid
        columns={[
          { field:'agreementNo', header:'Agreement #' },
          { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'fixedBillingAmount', header:'Amount', align:'right', renderCell:(v)=>v?formatCurrency(Number(v)):'—' },
          { field:'agreementDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
        ]}
        queryKey={['lfa','byClient']} queryFn={fetchClientLfas}
        FilterPanel={ClientLfaFilter} hasFilters isPaginated={false}
        emptyState={<Typography color="text.secondary">Select a client to view their LFAs</Typography>}
      />
    </PageShell>
  )
}