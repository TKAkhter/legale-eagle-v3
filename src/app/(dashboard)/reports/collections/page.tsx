import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showClient:true, showDepartment:true, showDateRange:true })

async function fetchCollections(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.post('/api/report/fee-earners/revenues',{},{
    params:{...qp, clientId:f.clientId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function CollectionsPage() {
  return (
    <ReportPage
      title="Collections Report"
      queryKey={['reports','collections']}
      queryFn={fetchCollections}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-collections-report"
      exportFilename="collections.xlsx"
      columns={[
        { field:'invoiceNo', header:'Invoice #' },
        { field:'client', header:'Client', renderCell:(v)=>{ const c=v as Record<string,string>; return c?.companyName??c?.firstName??'—' } },
        { field:'invoiceAmount', header:'Invoice', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'paidAmount', header:'Paid', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'balance', header:'Balance', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'invoiceStatus', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
        { field:'paymentDate', header:'Paid On', renderCell:(v)=>formatDate(String(v??'')) },
      ]}
    />
  )
}
