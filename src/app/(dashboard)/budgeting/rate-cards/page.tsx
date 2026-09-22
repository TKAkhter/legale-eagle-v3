import { useTranslation } from 'react-i18next'
import { Box, Avatar, Typography, Chip } from '@mui/material'
import { PageShell }     from '@/components/ui/PageShell'
import { DataGrid }      from '@/components/data-grid/DataGrid'
import { env }           from '@/config/env'
import { axiosClient }   from '@/lib/api/axios'
import { formatDate }     from '@/lib/utils/formatDate'
import { rateCards as staticRateCards } from '@/data/static'
import type { GridParams } from '@/types/common.types'

async function fetchRateCards(p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticRateCards as Record<string,unknown>[]
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const r = await axiosClient.get('/api/user/rate-cards/get', { params: { userId: p.filters?.userId ?? '' } })
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function RateCardsPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.rate-cards', 'Rate Cards')} description="Client billing rates per attorney and activity">
      <DataGrid
        columns={[
          { field: 'user', header: 'Attorney', minWidth: 180, renderCell: v => {
            const u = v as Record<string,string> | null
            const name = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'
            return (
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <Avatar sx={{ width:28, height:28, fontSize:11, bgcolor:'primary.main' }}>
                  {name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                </Avatar>
                <Typography variant="body2">{name}</Typography>
              </Box>
            )
          }},
          { field: 'client', header: 'Client', renderCell: v => {
            const c = v as Record<string,string> | null
            return c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || 'Default'
          }},
          { field: 'activityType', header: 'Activity' },
          { field: 'ratePerHour',  header: 'Rate/Hour', align: 'right', renderCell: v => `AED ${Number(v ?? 0).toFixed(2)}` },
          { field: 'billingType',  header: 'Type', renderCell: v => <Chip size="small" label={String(v ?? 'Hourly')} variant="outlined" /> },
          { field: 'effectiveDate', header: 'Effective', renderCell: v => formatDate(String(v ?? '')) },
        ]}
        queryKey={['budgeting','rate-cards']}
        queryFn={fetchRateCards}
        isPaginated={false}
        zebraStriping
      />
    </PageShell>
  )
}
