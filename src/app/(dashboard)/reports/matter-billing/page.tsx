import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showClient:true, showMatter:true, showDepartment:true, showDateRange:true })

async function fetchMatterBilling(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.post('/api/report/matter/billing/v2',{},{
    params:{...qp, clientId:f.clientId??'', matterId:f.matterId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function MatterBillingPage() {
  return (
    <ReportPage
      title="Matter Billing Report"
      queryKey={['reports','matterBilling']}
      queryFn={fetchMatterBilling}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-matter-billing-report"
      exportFilename="matter-billing.xlsx"
      columns={[
        { field:'matterTitle', header:'Matter' },
        { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
        { field:'billingType', header:'Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
        { field:'totalBilled', header:'Billed', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'totalPaid', header:'Paid', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'balance', header:'Balance', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
      ]}
    />
  )
}
