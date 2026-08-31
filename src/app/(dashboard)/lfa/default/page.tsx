import { PageShell } from '@/components/ui/PageShell'
import { env } from '@/config/env'
import { lfaApi } from '@/api/lfa'
import { Box, Typography } from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

async function fetchDefaultLfas(_p: GridParams) {
  const r = await axiosClient.get('/api/lfa/get/default')
  const list = r.data?.data??r.data??[]
  const arr = Array.isArray(list)?list:[list].filter(Boolean)
  return { content:arr, totalElements:arr.length, totalPages:1, number:0, size:arr.length, first:true, last:true, empty:arr.length===0 }
}

export default function DefaultLfasPage() {
  return (
    <PageShell title="Default LFAs" description="Default fee agreement templates">
      <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>Default LFAs apply automatically to new matters without a client-specific agreement.</Typography>
      <DataGrid
        columns={[
          { field:'lfaTitle', header:'Title' },
          { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'fixedBillingAmount', header:'Amount', align:'right', renderCell:(v)=>v?formatCurrency(Number(v)):'—' },
        ]}
        queryKey={['lfa','defaults']} queryFn={fetchDefaultLfas} isPaginated={false}
      />
    </PageShell>
  )
}