import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showUser:true, showDepartment:true, showDateRange:true })

async function fetchBilledAmount(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/department/billing/v2',{
    params:{...qp, departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function BilledAmountPage() {
  return (
    <ReportPage
      title="Billed Amount Report"
      queryKey={['reports','billedAmount']}
      queryFn={fetchBilledAmount}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-billing-report"
      exportFilename="billed-amount.xlsx"
      columns={[
        { field:'departmentName', header:'Department' },
        { field:'totalBilled', header:'Total Billed', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'totalPaid', header:'Total Paid', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
        { field:'outstanding', header:'Outstanding', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
      ]}
    />
  )
}
