import { useTranslation } from 'react-i18next'
import { Box, Button, Chip } from '@mui/material'
import { PageShell }     from '@/components/ui/PageShell'
import { DataGrid }      from '@components/data-grid/DataGrid'
import { StatusBadge }   from '@components/ui/StatusBadge'
import { env }           from '@/config/env'
import { axiosClient }   from '@lib/api/axios'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate }     from '@lib/utils/formatDate'
import { lfaItems as staticLfa } from '@/data/static'
import type { GridParams } from '@/types/common.types'
import type { FilterPanelProps } from '@components/data-grid/types'

function LfaClientFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  return (
    <Box sx={{ display:'flex', gap:1.5, alignItems:'flex-end' }}>
      <Box sx={{ flex:1 }}>
        <input
          style={{ width:'100%', padding:'8px 12px', borderRadius:6, border:'1px solid #ccc', fontSize:13 }}
          placeholder="Filter by client name…"
          defaultValue={String(filters.clientName ?? '')}
          onChange={e => onSearch({ clientName: e.target.value })}
        />
      </Box>
      <Button size="small" onClick={() => onReset()}>Reset</Button>
    </Box>
  )
}

async function fetchClientLfas(params: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticLfa as Record<string,unknown>[]
    const q = String(params.filters?.clientName ?? '').toLowerCase()
    const filtered = q ? list.filter(l => {
      const cl = l.client as Record<string,string> | null
      return `${cl?.companyName ?? ''} ${cl?.firstName ?? ''} ${cl?.lastName ?? ''}`.toLowerCase().includes(q)
    }) : list
    return { content: filtered, totalElements: filtered.length, totalPages: 1, number: 0, size: filtered.length, first: true, last: true, empty: filtered.length === 0 }
  }
  const clientId = params.filters?.clientId ?? ''
  if (!clientId) return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 0, first: true, last: true, empty: true }
  const r = await axiosClient.get('/api/lfa/get/client', { params: { clientId } })
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function ClientLfasPage() {
  const { t } = useTranslation()
  return (
    <PageShell title={t('nav.lfa-client', 'Client Fee Agreements')} description={t('lfa.clientDesc', 'Fee agreements by client')}>
      <DataGrid
        columns={[
          { field: 'agreementNo', header: 'Agreement No.', sortKey: 'agreementNo', minWidth: 140 },
          { field: 'client', header: 'Client', renderCell: (v) => {
            const c = v as Record<string,string> | null
            return c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || '—'
          }},
          { field: 'billingType',        header: 'Type',         renderCell: v => <Chip size="small" label={String(v ?? '')} variant="outlined" /> },
          { field: 'fixedBillingAmount', header: 'Amount',       align: 'right', renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: 'startDate',          header: 'Start Date',   renderCell: v => formatDate(String(v ?? '')) },
          { field: 'endDate',            header: 'End Date',     renderCell: v => v ? formatDate(String(v)) : '—' },
          { field: 'current',            header: 'Status',       renderCell: v => <StatusBadge status={v ? 'Active' : 'Inactive'} /> },
          { field: 'signatureStatus',    header: 'Signature',    renderCell: v => <StatusBadge status={String(v ?? 'Not Sent')} /> },
        ]}
        queryKey={['lfa', 'client']}
        queryFn={fetchClientLfas}
        FilterPanel={LfaClientFilter}
        hasFilters
        detailPath={row => `/lfa/${(row as Record<string,string>).id}`}
        defaultSortBy="agreementNo"
      />
    </PageShell>
  )
}
