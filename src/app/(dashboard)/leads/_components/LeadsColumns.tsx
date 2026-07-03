import { Chip } from '@mui/material'
import type { ColumnDef } from '@components/data-grid/types'
import { StatusBadge } from '@components/ui/StatusBadge'
import { formatDate } from '@lib/utils/formatDate'

export function getLeadsColumns(): ColumnDef<Record<string, unknown>>[] {
  return [
    { field: 'firstName', header: 'Name', sortKey: 'firstName', renderCell: (_, row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || '—' },
    { field: 'companyName', header: 'Company', sortKey: 'companyName' },
    { field: 'currentStatus', header: 'Status', renderCell: (v) => v ? <StatusBadge status={String(v)} /> : '—' },
    { field: 'practiceArea', header: 'Practice Area', renderCell: (v: unknown) => (v as { name?: string })?.name ?? '—' },
    { field: 'attorneyName', header: 'Attorney', sortKey: 'attorneyName' },
    { field: 'createdAt', header: 'Created', sortKey: 'createdAt', renderCell: (v) => formatDate(String(v ?? '')) },
    { field: 'nextFollowUpDate', header: 'Next Follow Up', renderCell: (v) => formatDate(String(v ?? '')) },
  ]
}
