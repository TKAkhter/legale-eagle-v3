import { PageShell } from '@/components/ui/PageShell'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { env } from '@/config/env'
import { axiosClient } from '@lib/api/axios'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'

const STATIC = [
  { id: 'h1', hearingTitle: 'Case Management Conference', matterTitle: '260303 — Building Dispute', hearingDate: '2026-09-25', location: 'Dubai Courts', status: 'Scheduled' },
  { id: 'h2', hearingTitle: 'Witness Examination', matterTitle: '260293 — Rental Dispute', hearingDate: '2026-09-28', location: 'Abu Dhabi Judicial Dept', status: 'Scheduled' },
]

async function fetchUpcoming(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    return { content: STATIC, totalElements: STATIC.length, totalPages: 1, number: 0, size: STATIC.length, first: true, last: true, empty: false }
  }
  const r = await axiosClient.get('/api/hearing/for/attorney')
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function UpcomingHearingsPage() {
  return (
    <PageShell title="Upcoming Hearings" description="Hearings assigned to you">
      <DataGrid
        columns={[
          { field: 'hearingTitle', header: 'Hearing', renderCell: (v, row) => String(v || (row as Record<string, unknown>).title || '—') },
          {
            field: 'matterTitle',
            header: 'Matter',
            renderCell: (v, row) => {
              const m = (row as Record<string, unknown>).matter as Record<string, string> | null
              return String(v || m?.title || '—')
            },
          },
          {
            field: 'hearingDate',
            header: 'Date',
            renderCell: (v, row) => formatDate(String(v || (row as Record<string, unknown>).date || '')),
          },
          {
            field: 'location',
            header: 'Location',
            renderCell: (v, row) => {
              const loc = (row as Record<string, unknown>).hearingLocation as Record<string, string> | string | null
              if (typeof loc === 'string') return loc
              return String(v || loc?.name || '—')
            },
          },
          { field: 'status', header: 'Status', renderCell: v => <StatusBadge status={String(v || 'Scheduled')} /> },
        ]}
        queryKey={['hearings', 'upcoming']}
        queryFn={fetchUpcoming}
        isPaginated={false}
        zebraStriping
      />
    </PageShell>
  )
}
