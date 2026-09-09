/**
 * ColumnHeader.tsx — sortable, draggable table column header.
 *
 * Features:
 *   - Click to sort (server-side)
 *   - Drag to reorder (when reorderable=true)
 *   - Sticky positioning for pinned columns (column.sticky = "left"|"right")
 *   - Drag-over highlight
 */
import { useRef } from 'react'
import { TableCell, TableSortLabel, Box } from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type { ColumnDef } from './types'

interface Props<T> {
  column:      ColumnDef<T>
  sortBy:      string
  sortDir:     'asc' | 'desc'
  onSort:      (field: string) => void
  index?:      number
  reorderable?: boolean
  onDragStart?: (index: number) => void
  onDragOver?:  (index: number) => void
  onDrop?:      (index: number) => void
  isDragOver?:  boolean
}

export function ColumnHeader<T>({
  column, sortBy, sortDir, onSort,
  index = 0, reorderable = false,
  onDragStart, onDragOver, onDrop, isDragOver,
}: Props<T>) {
  const sortKey = column.sortKey ?? String(column.field)
  const active  = sortBy === sortKey
  const dragRef = useRef<HTMLTableCellElement>(null)

  const sticky = column.sticky
    ? {
        position: 'sticky' as const,
        [column.sticky]: 0,
        zIndex: 3,
        bgcolor: 'background.paper',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0, bottom: 0,
          [column.sticky === 'left' ? 'right' : 'left']: -1,
          width: 1,
          bgcolor: 'divider',
        },
      }
    : {}

  return (
    <TableCell
      ref={dragRef}
      align={column.align ?? 'left'}
      draggable={reorderable}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(index) }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(index) }}
      sx={{
        width: column.width, minWidth: column.minWidth,
        userSelect: 'none',
        bgcolor: isDragOver ? 'action.selected' : undefined,
        borderRight: isDragOver ? '2px solid' : undefined,
        borderRightColor: isDragOver ? 'primary.main' : undefined,
        transition: 'background 150ms, border 150ms',
        cursor: reorderable ? 'grab' : 'default',
        ...sticky,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Drag handle — only visible when reorderable */}
        {reorderable && (
          <DragIndicatorIcon
            sx={{ fontSize: 14, color: 'text.disabled', opacity: 0.5, flexShrink: 0, cursor: 'grab' }}
          />
        )}
        {column.sortKey !== undefined ? (
          <TableSortLabel
            active={active}
            direction={active ? sortDir : 'asc'}
            onClick={() => onSort(sortKey)}
            sx={{ flex: 1 }}
          >
            {column.header}
          </TableSortLabel>
        ) : (
          <Box sx={{ flex: 1 }}>{column.header}</Box>
        )}
      </Box>
    </TableCell>
  )
}
