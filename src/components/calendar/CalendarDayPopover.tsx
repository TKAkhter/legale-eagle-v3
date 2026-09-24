import { Popover, Typography, Divider, Button, Box } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useQuery } from '@tanstack/react-query'
import { CalendarEntryTable } from './CalendarEntryTable'
import type { ColumnDef } from '@components/data-grid/types'
import { formatDate } from '@lib/utils/formatDate'

interface Props<T> {
  anchorEl: Element | null
  date: string | null
  onClose: () => void
  entryQueryFn?: (d: string) => Promise<T[]>
  columns?: ColumnDef<T>[]
  onAddEntry?: (date: string) => void
  onEditEntry?: (row: T, date: string) => void
}

export function CalendarDayPopover<T extends Record<string, unknown>>({
  anchorEl, date, onClose, entryQueryFn, columns = [], onAddEntry, onEditEntry,
}: Props<T>) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['calendar', 'day', date],
    queryFn: () => entryQueryFn!(date!),
    enabled: !!anchorEl && !!date && !!entryQueryFn,
  })

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { p: 2, minWidth: 400, maxWidth: 600 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {date ? formatDate(date) : ''}
        </Typography>
        {onAddEntry && date && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => { onAddEntry(date); onClose() }}>
            Add entry
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 1 }} />
      <CalendarEntryTable
        rows={data as T[]}
        columns={columns}
        loading={isLoading}
        onRowClick={onEditEntry && date ? (row) => { onEditEntry(row, date); onClose() } : undefined}
      />
    </Popover>
  )
}
