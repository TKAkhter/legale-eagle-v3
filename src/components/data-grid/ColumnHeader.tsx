import { TableCell, TableSortLabel, Box } from '@mui/material'
import type { ColumnDef } from './types'

interface Props<T> {
  column: ColumnDef<T>
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
}
export function ColumnHeader<T>({ column, sortBy, sortDir, onSort }: Props<T>) {
  const sortKey = column.sortKey ?? String(column.field)
  const active  = sortBy === sortKey
  return (
    <TableCell align={column.align ?? 'left'} sx={{ width: column.width, minWidth: column.minWidth,
      ...(column.sticky ? { position: 'sticky', [column.sticky]: 0, zIndex: 3, bgcolor: 'background.paper' } : {}) }}>
      {column.sortKey !== undefined || column.sortKey === '' ? (
        <TableSortLabel active={active} direction={active ? sortDir : 'asc'} onClick={() => onSort(sortKey)}>
          {column.header}
        </TableSortLabel>
      ) : column.header}
    </TableCell>
  )
}
