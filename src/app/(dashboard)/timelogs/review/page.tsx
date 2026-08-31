import { PageShell } from '@/components/ui/PageShell'
import { Box, Typography } from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatDate } from '@lib/utils/formatDate'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import type { GridParams } from '@/types/common.types'
import { timelogsApi } from '@/api/timelogs'
import { env } from '@/config/env'

const FilterPanel = makeReportFilterPanel({ showUser:true, showMatter:true, showDateRange:true })

async function fetchForReview(params: GridParams) {
  if (env.USE_STATIC_DATA) return timelogsApi.getAll(params)
  const qp = buildQueryParams(params,{paginationConvention:'pageNumber-pageSize'})
  const f = params.filters??{}
  const r = await axiosClient.get('/api/activity/for-approval/by-user/v2',{
    params:{...qp, userId:f.userId??'', matterId:f.matterId??'', fromDate:f.fromDate??'', toDate:f.toDate??'', revenueStatus:'DRAFT'}
  })
  return r.data?.data??r.data
}

export default function TimelogsReviewPage() {
  return (
    <PageShell title="Timelogs Review" description="Draft time entries pending review before pre-approval">
      <DataGrid
        columns={[
          { field:'activity', header:'Activity' },
          { field:'matter', header:'Matter', renderCell:(v)=>(v as Record<string,string>)?.title??'—' },
          { field:'responsiblePerson', header:'By', renderCell:(v)=>{ const u=v as Record<string,string>; return u?`${u.firstName??''} ${u.lastName??''}`.trim():'—' } },
          { field:'totalHours', header:'Hours', align:'right' },
          { field:'billing', header:'Amount', align:'right', renderCell:(v)=>formatCurrency(Number(v??0)) },
          { field:'revenueStatus', header:'Status', renderCell:(v)=><StatusBadge status={String(v??'')} /> },
          { field:'entryDate', header:'Date', renderCell:(v)=>formatDate(String(v??'')) },
        ]}
        queryKey={['timelogs','review']} queryFn={fetchForReview}
        FilterPanel={FilterPanel} hasFilters syncWithUrl hasRowSelection
      />
    </PageShell>
  )
}