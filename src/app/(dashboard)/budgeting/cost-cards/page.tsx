import { useTranslation } from 'react-i18next'
import { Box, Button, Avatar, Typography } from '@mui/material'
import { PageShell }     from '@/components/ui/PageShell'
import { DataGrid }      from '@components/data-grid/DataGrid'
import { env }           from '@/config/env'
import { axiosClient }   from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate }     from '@lib/utils/formatDate'
import { costCards as staticCostCards } from '@/data/static'
import type { GridParams } from '@/types/common.types'

async function fetchCostCards(p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticCostCards as Record<string,unknown>[]
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const r = await axiosClient.get('/api/user/cost-cards/all', { params: { userId: p.filters?.userId ?? '' } })
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function CostCardsPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.cost-cards', 'Cost Cards')} description="Attorney cost rates per activity">
      <DataGrid
        columns={[
          { field: 'user', header: 'Attorney', minWidth: 180, renderCell: v => {
            const u = v as Record<string,string> | null
            const name = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'
            return (
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <Avatar sx={{ width:28, height:28, fontSize:11, bgcolor:'secondary.main' }}>
                  {name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </Avatar>
                <Typography variant="body2">{name}</Typography>
              </Box>
            )
          }},
          { field: 'activityType',  header: 'Activity Type' },
          { field: 'costPerHour',   header: 'Cost/Hour',   align: 'right', renderCell: v => `AED ${Number(v ?? 0).toFixed(2)}` },
          { field: 'effectiveDate', header: 'Effective From', renderCell: v => formatDate(String(v ?? '')) },
          { field: 'expiryDate',    header: 'Expires',     renderCell: v => v ? formatDate(String(v)) : 'No expiry' },
        ]}
        queryKey={['budgeting','cost-cards']}
        queryFn={fetchCostCards}
        isPaginated={false}
        zebraStriping
      />
    </PageShell>
  )
}
