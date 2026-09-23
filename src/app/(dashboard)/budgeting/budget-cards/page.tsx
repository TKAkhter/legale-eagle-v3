import { useTranslation } from 'react-i18next'
import { Box, Typography, Chip } from '@mui/material'
import { PageShell } from '@/components/ui/PageShell'
import { DataGrid } from '@components/data-grid/DataGrid'
import { env } from '@/config/env'
import { axiosClient } from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { budgetCards as staticBudgetCards } from '@/data/static'
import type { GridParams } from '@/types/common.types'

async function fetchBudgets(p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = (staticBudgetCards as Record<string, unknown>[]).map((b, i) => ({
      ...b,
      userName: ['Sarah Johnson', 'Dory Abi Khalil'][i % 2],
      month: 8,
      year: 2026,
      amount: Number((b as { fixedBillingAmount?: number }).fixedBillingAmount ?? 10000),
    }))
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const f = p.filters ?? {}
  const r = await axiosClient.get('/api/budget/get', {
    params: {
      pageNumber: p.page,
      pageSize: p.pageSize,
      userId: f.userId ?? '',
      month: f.month ?? '',
      year: f.year ?? '',
    },
  })
  const d = r.data?.data ?? r.data
  if (Array.isArray(d?.content) || typeof d?.totalElements === 'number') return d
  const arr = Array.isArray(d) ? d : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function BudgetCardsPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.budget-cards', 'Budget Cards')} description="User monthly budget amounts">
      <DataGrid
        columns={[
          {
            field: 'userName',
            header: 'User',
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const u = r.user as Record<string, string> | null
              return String(v || (u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '') || '—')
            },
          },
          { field: 'month', header: 'Month', renderCell: v => String(v ?? '—') },
          { field: 'year', header: 'Year', renderCell: v => String(v ?? '—') },
          {
            field: 'amount',
            header: 'Budget Amount',
            align: 'right',
            renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).budgetAmount ?? 0)),
          },
          {
            field: 'status',
            header: 'Status',
            renderCell: v => <Chip size="small" label={String(v ?? 'Active')} variant="outlined" />,
          },
        ]}
        queryKey={['budgeting', 'budget-cards']}
        queryFn={fetchBudgets}
        zebraStriping
      />
    </PageShell>
  )
}
