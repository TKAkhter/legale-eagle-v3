import { ReportPage } from '@components/data-grid/ReportPage'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDateTime } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showUser:true, showMatter:true, showDateRange:true })

async function fetchActivityHistory(params: GridParams) {
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/report/activity/history',{
    params:{...qp, userId:f.userId??'', matterId:f.matterId??'', fromDate:f.fromDate??'', toDate:f.toDate??'', activityModificationType:''}
  })
  return r.data?.data??r.data
}

export default function ActivityHistoryPage() {
  return (
    <ReportPage
      title="Activity History Report"
      description="Audit trail of all time log edits, approvals, discounts, and deletions"
      queryKey={['reports','activityHistory']}
      queryFn={fetchActivityHistory}
      FilterPanel={FilterPanel}
      exportUrl="/api/reports/export-excel/fee-earners/download-activity-history-report"
      exportFilename="activity-history.xlsx"
      columns={[
        { field:'activity', header:'Activity' },
        { field:'modifiedBy', header:'Modified By' },
        { field:'modificationType', header:'Change Type', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
        { field:'modificationDate', header:'Date/Time', renderCell:(v)=>formatDateTime(String(v??'')) },
        { field:'oldValue', header:'Old Value' },
        { field:'newValue', header:'New Value' },
      ]}
    />
  )
}
