import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showUser:true, showClient:true, showMatter:true, showDepartment:true, showDateRange:true })

async function fetchWip(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/wip-reports/fee-earners',{
    params:{...qp, userId:f.userId??'', clientId:f.clientId??'', matterId:f.matterId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??'', invoiceCreated:false}
  })
  return r.data?.data??r.data
}

export default function WipPage() {
  return (
    <ReportPage
      title="WIP Reports"
      description="Work in Progress — billable time not yet invoiced"
      queryKey={['reports','wip']}
      queryFn={fetchWip}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-wip-report"
      exportFilename="wip-report.xlsx"
      columns={[
        { field:'userName', header:'Fee Earner' },
        { field:'matterTitle', header:'Matter' },
        { field:'activity', header:'Activity' },
        { field:'totalHours', header:'Hours', align:'right' },
        { field:'totalAmount', header:'Amount', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
      ]}
    />
  )
}
