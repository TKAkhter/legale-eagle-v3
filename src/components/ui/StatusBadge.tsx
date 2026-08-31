import { Chip } from '@mui/material'

const COLOR_MAP: Record<string, 'success'|'error'|'warning'|'info'|'default'> = {
  // Active/positive
  OPEN:'success', Open:'success', Active:'success', active:'success',
  Approved:'success', approved:'success', APPROVED:'success',
  Paid:'success', paid:'success', Completed:'success', completed:'success',
  COMPLETED:'success', Scheduled:'success', scheduled:'success',
  CONVERTED:'success', Converted:'success',
  // Negative
  CLOSE:'default', Closed:'default', CLOSED:'default', closed:'default',
  inactive:'default', Inactive:'default', INACTIVE:'default',
  Void:'default', Canceled:'default', CANCELED:'default', WRITE_OFF:'default',
  Rejected:'error', REJECTED:'error', rejected:'error',
  Overdue:'error', OVERDUE:'error', overdue:'error', overDue:'error',
  FAILED:'error', Failed:'error',
  // Pending/warning
  PENDING:'warning', Pending:'warning', pending:'warning',
  Draft:'warning', DRAFT:'warning', draft:'warning',
  Due:'warning', DUE:'warning',
  NEW:'warning', New:'warning',
  FOLLOW_UP:'warning', Follow_Up:'warning',
  PRE_APPROVAL:'warning', Pre_Approval:'warning',
  In_Progress:'warning', IN_PROGRESS:'warning', InProgress:'warning',
  // Info/neutral
  RE_OPEN:'info', ReOpen:'info', re_open:'info',
  Partially_Paid:'info', PARTIALLY_PAID:'info',
  Approval:'info', APPROVAL:'info',
  Pending_Approval:'info', PENDING_APPROVAL:'info',
  Processing:'info', PROCESSING:'info',
  Paused:'info', PAUSED:'info',
  Review:'info', REVIEW:'info',
}

interface Props { status: string; size?: 'small'|'medium' }

export function StatusBadge({ status, size='small' }: Props) {
  const color = COLOR_MAP[status] ?? 'default'
  const label = status.replace(/_/g,' ').replace(/([A-Z])/g, ' $1').trim()
  return <Chip label={label} color={color} size={size} variant="outlined" sx={{ fontWeight: 500, fontSize: size === 'small' ? 11 : 13 }} />
}
