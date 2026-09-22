import { useTranslation } from 'react-i18next'
import { Chip } from '@mui/material'
import { PageShell }     from '@/components/ui/PageShell'
import { DataGrid }      from '@/components/data-grid/DataGrid'
import { StatusBadge }   from '@/components/ui/StatusBadge'
import { env }           from '@/config/env'
import { axiosClient }   from '@/lib/api/axios'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { lfaItems as staticLfa } from '@/data/static'
import type { GridParams } from '@/types/common.types'

async function fetchDefaultLfas(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticLfa as Record<string,unknown>[]
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const r = await axiosClient.get('/api/lfa/get/default')
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function DefaultLfasPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.lfa-default', 'Default Fee Agreements')} description={t('lfa.defaultDesc', 'Standard fee agreement templates')}>
      <DataGrid
        columns={[
          { field: 'agreementNo',       header: 'Agreement No.',  sortKey: 'agreementNo', minWidth: 140 },
          { field: 'billingType',        header: 'Billing Type',   renderCell: v => <Chip size="small" label={String(v ?? '')} variant="outlined" /> },
          { field: 'fixedBillingAmount', header: 'Fixed Amount',   align: 'right', renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: 'hourlyRate',         header: 'Hourly Rate',    align: 'right', renderCell: v => v ? `AED ${Number(v).toFixed(2)}/hr` : '—' },
          { field: 'sessionRate',        header: 'Session Rate',   align: 'right', renderCell: v => v ? `AED ${Number(v).toFixed(2)}` : '—' },
          { field: 'current',            header: 'Status',         renderCell: v => <StatusBadge status={v ? 'Active' : 'Inactive'} /> },
        ]}
        queryKey={['lfa', 'default']}
        queryFn={fetchDefaultLfas}
        isPaginated={false}
        defaultSortBy="agreementNo"
      />
    </PageShell>
  )
}
