/**
 * ColumnHeader.tsx — sortable, draggable, resizable column header.
 *
 * Features:
 *   - Click to sort
 *   - Drag to reorder (reorderable=true)
 *   - Drag right edge to resize (resizable=true)
 *   - Sticky left/right positioning
 */
import { useRef } from 'react'
import { TableCell, TableSortLabel, Box } from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type { ColumnDef } from './types'

interface Props<T> {
  column:       ColumnDef<T>
  sortBy:       string
  sortDir:      'asc' | 'desc'
  onSort:       (field: string) => void
  index?:       number
  reorderable?: boolean
  resizable?:   boolean
  colWidths?:   Record<string, number>
  onResize?:    (field: string, newWidth: number) => void
  onDragStart?: (index: number) => void
  onDragOver?:  (index: number) => void
  onDrop?:      (index: number) => void
  isDragOver?:  boolean
}

export function ColumnHeader<T>({
  column, sortBy, sortDir, onSort,
  index = 0, reorderable = false, resizable = false,
  colWidths = {}, onResize,
  onDragStart, onDragOver, onDrop, isDragOver,
}: Props<T>) {
  const sortKey  = column.sortKey ?? String(column.field)
  const active   = sortBy === sortKey
  const resizing = useRef(false)
  const startX   = useRef(0)
  const startW   = useRef(0)

  const currentWidth = colWidths[String(column.field)] ?? column.width

  const sticky = column.sticky ? {
    position: 'sticky' as const,
    [column.sticky]: 0,
    zIndex: 3,
    bgcolor: 'background.paper',
    '&::after': {
      content: '""', position: 'absolute', top: 0, bottom: 0,
      [column.sticky === 'left' ? 'right' : 'left']: -1,
      width: 1, bgcolor: 'divider',
    },
  } : {}

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    startX.current   = e.clientX
    startW.current   = (e.currentTarget.parentElement as HTMLElement)?.offsetWidth ?? (Number(currentWidth) || 120)

    function onMouseMove(ev: MouseEvent) {
      if (!resizing.current) return
      const newW = Math.max(60, startW.current + (ev.clientX - startX.current))
      onResize?.(String(column.field), newW)
    }
    function onMouseUp() {
      resizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  return (
    <TableCell
      align={column.align ?? 'left'}
      draggable={reorderable}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={e => { e.preventDefault(); onDragOver?.(index) }}
      onDrop={e => { e.preventDefault(); onDrop?.(index) }}
      sx={{
        width:    currentWidth,
        minWidth: column.minWidth,
        position: 'relative',
        userSelect: 'none',
        bgcolor:  isDragOver ? 'action.selected' : undefined,
        borderRight: isDragOver ? '2px solid' : undefined,
        borderRightColor: isDragOver ? 'primary.main' : undefined,
        transition: 'background 150ms',
        cursor: reorderable ? 'grab' : 'default',
        ...sticky,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: resizable ? 1.5 : 0 }}>
        {reorderable && (
          <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', opacity: 0.5, flexShrink: 0 }} />
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

      {/* Resize handle */}
      {resizable && (
        <Box
          onMouseDown={onResizeMouseDown}
          sx={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: 6, cursor: 'col-resize',
            '&:hover': { bgcolor: 'primary.main', opacity: 0.4 },
            transition: 'background 150ms',
          }}
        />
      )}
    </TableCell>
  )
}
