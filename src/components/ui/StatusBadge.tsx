import { Chip } from '@mui/material'
const COLOR_MAP: Record<string, 'success'|'error'|'warning'|'info'|'default'> = {
  OPEN:'success', Open:'success', Active:'success', active:'success', Approved:'success', approved:'success', Paid:'success',
  CLOSE:'default', Closed:'default', inactive:'default', Void:'default', Canceled:'default',
  PENDING:'warning', Pending:'warning', Draft:'warning', Due:'warning', Overdue:'error', Rejected:'error',
  RE_OPEN:'info', Partially_Paid:'info', Approval:'info',
}
interface Props { status:string; size?:'small'|'medium' }
export function StatusBadge({ status, size='small' }: Props) {
  const color = COLOR_MAP[status] ?? 'default'
  return <Chip label={status.replace(/_/g,' ')} color={color} size={size} variant="outlined" />
}
