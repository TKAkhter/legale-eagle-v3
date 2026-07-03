import { Box, Typography, Button, Alert } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showClient:true, showDepartment:true, showDateRange:true })

async function fetchMarginErosion(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'page-size'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/get/me-report-cache',{
    params:{...qp, clientId:f.clientId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function MarginErosionPage() {
  const qc = useQueryClient()
  const [rebuilding,setRebuilding] = useState(false)

  async function rebuildCache() {
    setRebuilding(true)
    try {
      await axiosClient.post('/api/revenue/matter-erosion-activities-group-by-matter/generate-cache')
      qc.invalidateQueries({ queryKey:['reports','marginErosion'] })
    } finally { setRebuilding(false) }
  }

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>Margin Erosion Report</Typography>
        <Button size="small" startIcon={<RefreshIcon/>} onClick={rebuildCache} disabled={rebuilding} variant="outlined">
          {rebuilding ? 'Rebuilding cache…' : 'Rebuild Cache'}
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb:2 }}>This report is generated from a server-side cache. Click "Rebuild Cache" to refresh data.</Alert>
      <ReportPage
        title="" queryKey={['reports','marginErosion']} queryFn={fetchMarginErosion}
        FilterPanel={FilterPanel}
        exportUrl="/api/reports/export-excel/fee-earners/download-margin-erosion-report"
        exportFilename="margin-erosion.xlsx"
        columns={[
          { field:'matterTitle', header:'Matter' },
          { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
          { field:'budgetedAmount', header:'Budgeted', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'actualAmount', header:'Actual', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'erosion', header:'Erosion', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'erosionPercentage', header:'Erosion %', align:'right', renderCell:(v)=>v!=null?`${Number(v).toFixed(1)}%`:'—' },
        ]}
      />
    </Box>
  )
}
