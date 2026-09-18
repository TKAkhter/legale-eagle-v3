import { useTranslation } from 'react-i18next'
import { Box, Typography, LinearProgress, Chip } from '@mui/material'
import { PageShell }     from '@/components/ui/PageShell'
import { DataGrid }      from '@components/data-grid/DataGrid'
import { env }           from '@/config/env'
import { axiosClient }   from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { budgetCards as staticBudgetCards } from '@/data/static'
import type { GridParams } from '@/types/common.types'

async function fetchBudgets(p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticBudgetCards as Record<string,unknown>[]
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const f = p.filters ?? {}
  const r = await axiosClient.get('/api/budgets/get', { params: { pageNumber: p.page, pageSize: p.pageSize, departmentId: f.departmentId ?? '' } })
  return r.data?.data ?? r.data
}

export default function BudgetCardsPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.budget-cards', 'Budget Cards')} description="Matter and department budget tracking">
      <DataGrid
        columns={[
          { field: 'matter', header: 'Matter', minWidth: 200, renderCell: v => {
            const m = v as Record<string,string> | null
            return m?.title ?? String(v ?? '—')
          }},
          { field: 'department', header: 'Department', renderCell: v => {
            const d = v as Record<string,string> | null
            return d?.name ?? String(v ?? '—')
          }},
          { field: 'budgetAmount',  header: 'Budget',  align: 'right', renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: 'spentAmount',   header: 'Spent',   align: 'right', renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: 'remaining',     header: 'Remaining', align: 'right', renderCell: (v, row) => {
            const r = row as Record<string,number>
            const pct = r.budgetAmount > 0 ? (r.spentAmount / r.budgetAmount) * 100 : 0
            return (
              <Box sx={{ minWidth: 120 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight:600, color: pct > 90 ? 'error.main' : pct > 70 ? 'warning.main' : 'success.main' }}>
                    {formatCurrency(Number(v ?? 0))}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">{pct.toFixed(0)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, pct)}
                  sx={{ height: 4, borderRadius: 2, bgcolor:'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: pct > 90 ? 'error.main' : pct > 70 ? 'warning.main' : 'success.main' }
                  }} />
              </Box>
            )
          }},
          { field: 'status', header: 'Status', renderCell: v => <Chip size="small" label={String(v ?? 'Active')} color={String(v) === 'Exceeded' ? 'error' : 'default'} variant="outlined" /> },
        ]}
        queryKey={['budgeting','budget-cards']}
        queryFn={fetchBudgets}
        zebraStriping
      />
    </PageShell>
  )
}
