import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showUser:true, showDepartment:true, showDateRange:true })

async function fetchUtilization(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/fee-earners/util-report',{
    params:{...qp, userId:f.userId??'', departmentId:f.departmentId??'', fromDate:f.fromDate??'', toDate:f.toDate??''}
  })
  return r.data?.data??r.data
}

export default function UtilizationPage() {
  return (
    <ReportPage
      title="Utilization Report"
      description="Tracks billable hours vs total working hours per fee earner"
      queryKey={['reports','utilization']}
      queryFn={fetchUtilization}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-util-report"
      exportFilename="utilization.xlsx"
      columns={[
        { field:'userName', header:'Fee Earner' },
        { field:'department', header:'Department' },
        { field:'billableHours', header:'Billable Hrs', align:'right' },
        { field:'nonBillableHours', header:'Non-Billable Hrs', align:'right' },
        { field:'totalHours', header:'Total Hrs', align:'right' },
        { field:'utilization', header:'Utilization %', align:'right', renderCell:(v)=>v!=null?`${Number(v).toFixed(1)}%`:'—' },
      ]}
    />
  )
}
