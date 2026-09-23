import { Popover, Typography, Divider } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { CalendarEntryTable } from './CalendarEntryTable'
import type { ColumnDef } from '@components/data-grid/types'
import { formatDate } from '@lib/utils/formatDate'
interface Props<T> { anchorEl:Element|null; date:string|null; onClose:()=>void; entryQueryFn?:(d:string)=>Promise<T[]>; columns?:ColumnDef<T>[] }
export function CalendarDayPopover<T extends Record<string,unknown>>({ anchorEl, date, onClose, entryQueryFn, columns=[] }: Props<T>) {
  const { data=[], isLoading } = useQuery({ queryKey:['calendar','day',date], queryFn:()=>entryQueryFn!(date!), enabled:!!anchorEl&&!!date&&!!entryQueryFn })
  return (
    <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={onClose} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}
      slotProps={{ paper: { sx: { p: 2, minWidth: 400, maxWidth: 600 } } }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{date ? formatDate(date) : ''}</Typography>
      <Divider sx={{ mb:1 }} />
      <CalendarEntryTable rows={data as T[]} columns={columns} loading={isLoading} />
    </Popover>
  )
}
