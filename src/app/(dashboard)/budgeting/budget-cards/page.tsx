import { Box, Typography } from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { axiosClient } from '@lib/api/axios'
import { buildQueryParams } from '@lib/utils/buildQueryParams'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'
import { makeReportFilterPanel } from '@components/filters/ReportFilterPanel'
import type { GridParams } from '@/types/common.types'

const FilterPanel = makeReportFilterPanel({ showDepartment: true, showDateRange: true })

async function fetchBudgets(params: GridParams) {
  const qp = buildQueryParams(params, { paginationConvention: 'pageNumber-pageSize' })
  const f = params.filters ?? {}
  const r = await axiosClient.get('/api/budgets/get', { params: { ...qp, departmentId: f.departmentId ?? '', fromDate: f.fromDate ?? '', toDate: f.toDate ?? '' } })
  return r.data?.data ?? r.data
}

export default function BudgetCardsPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Budget Cards</Typography>
      <DataGrid
        columns={[
          { field: 'department', header: 'Department', renderCell: (v) => (v as Record<string, string>)?.name ?? '—' },
          { field: 'budgetedAmount', header: 'Budgeted', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'actualAmount', header: 'Actual', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'variance', header: 'Variance', align: 'right', renderCell: (v) => formatCurrency(Number(v ?? 0)) },
          { field: 'fromDate', header: 'From', renderCell: (v) => formatDate(String(v ?? '')) },
          { field: 'toDate', header: 'To', renderCell: (v) => formatDate(String(v ?? '')) },
        ]}
        queryKey={['budgeting', 'budgetCards']} queryFn={fetchBudgets}
        FilterPanel={FilterPanel} hasFilters syncWithUrl
      />
    </Box>
  )
}
