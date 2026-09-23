import { Chip } from '@mui/material'
import type { ColumnDef } from '@components/data-grid/types'
import { StatusBadge } from '@components/ui/StatusBadge'
import { formatDate } from '@lib/utils/formatDate'

/** Columns aligned to transformLead() output (not raw BE fields). */
export function getLeadsColumns(): ColumnDef<Record<string, unknown>>[] {
  return [
    { field: 'name', header: 'Name', sortKey: 'firstName', renderCell: (v) => String(v || '—') },
    {
      field: 'email',
      header: 'Contact',
      renderCell: (_, row) => {
        const r = row as { email?: string; phone?: string }
        return [r.email, r.phone].filter(Boolean).join(' · ') || '—'
      },
    },
    { field: 'status', header: 'Lead Status', renderCell: (v) => v ? <StatusBadge status={String(v)} /> : '—' },
    { field: 'lastStatusUpdatedDate', header: 'Last Status Update', renderCell: (v) => v ? formatDate(String(v)) : '—' },
    { field: 'leadSource', header: 'Lead Source', renderCell: (v) => String(v || '—') },
    { field: 'practiceArea', header: 'Practice Area', renderCell: (v) => String(v || '—') },
    { field: 'dispute', header: 'Dispute', renderCell: (v) => String(v || '—') },
    { field: 'followUp', header: 'Follow Up', renderCell: (v) => String(v || '—') },
    { field: 'conflictCheckStatus', header: 'Conflict', renderCell: (v) => <Chip size="small" label={String(v || '—')} variant="outlined" /> },
    { field: 'attorneyName', header: 'Allotted Lawyer', sortKey: 'attorneyName', renderCell: (v) => String(v || '—') },
    { field: 'createdBy', header: 'Created By', renderCell: (v) => String(v || '—') },
    { field: 'partyOpposing', header: 'Party Opposing', renderCell: (v) => String(v || '—') },
    { field: 'createdAt', header: 'Created', sortKey: 'createdAt', renderCell: (v) => formatDate(String(v ?? '')) },
  ]
}
