/**
 * DataGrid.tsx — enterprise list component.
 *
 * Phase 31 additions:
 *   Column drag-to-reorder  — reorderableColumns prop
 *   Inline cell editing     — column.editable + column.onEdit
 *   Column pinning          — column.sticky = "left"|"right"
 *
 * Full feature list:
 *   Filtering, sorting, pagination, row selection, bulk actions,
 *   export, email, column visibility, density, row expansion,
 *   filter presets, mobile cards, right-click menu, keyboard nav,
 *   Ctrl+C copy, context menu, zebra striping, skeleton loading,
 *   error state with retry.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from '@mui/material'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Typography, Alert, Collapse, Button, Box,
} from '@mui/material'
import type { DataGridProps, TableDensity, ColumnDef } from './types'
import type { GridParams } from '@/types/common.types'
import { Pagination }             from './Pagination'
import { SkeletonRows }           from './SkeletonRows'
import { ColumnHeader }           from './ColumnHeader'
import { RowMenu }                from './RowMenu'
import { ActiveFilterChips }      from './ActiveFilterChips'
import { ColumnVisibilityToggle } from './ColumnVisibilityToggle'
import { DensityToggle, loadDensity } from './DensityToggle'
import { EmailDialog }            from './EmailDialog'
import { FilterPresetsBar }       from './FilterPresetsBar'
import { MobileCardList }         from './MobileCardList'
import { DataGridToolbar }        from './DataGridToolbar'
import { ContextMenu }            from './ContextMenu'
import { InlineCellEditor }       from './InlineCellEditor'
import { useUrlState }            from '@hooks/useUrlState'
import { downloadBlob }           from '@lib/utils/downloadBlob'
import { logger }                 from '@/lib/logger'
import { toast }                  from '@/lib/toast'

const DENSITY_PY: Record<TableDensity, number> = {
  compact: 0.25, normal: 0.75, comfortable: 1.5,
}

interface ContextMenuState<T> { row: T; x: number; y: number }
interface EditingCell { rowId: string; field: string; value: string }

export function DataGrid<TData extends Record<string, unknown>>({
  columns, queryKey, queryFn,
  FilterPanel, rowMenuItems, bulkActions, detailPath, exportFn,
  exportFilename = 'export.xlsx', emptyState, rowExpansion,
  emailConfig, filterPresets = [],
  isPaginated       = true,
  isSortingBackend  = true,
  hasRowSelection   = false,
  hasExport         = false,
  hasFilters        = false,
  hasEmail          = false,
  syncWithUrl: _su  = true,
  zebraStriping     = false,
  reorderableColumns = false,
  defaultDensity    = 'normal',
  defaultPageSize   = 25,
  defaultSortBy     = 'createdAt',
  defaultSortDir    = 'desc',
  onRowClick, rowKey = 'id' as keyof TData,
}: DataGridProps<TData>) {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width:639px)')

  // ── State ───────────────────────────────────────────────────────────────────
  const [colOrder,      setColOrder]      = useState<number[]>([])
  const [dragFrom,      setDragFrom]      = useState<number|null>(null)
  const [dragOver,      setDragOver]      = useState<number|null>(null)
  const [editingCell,   setEditingCell]   = useState<EditingCell|null>(null)
  const [visibleFields, setVisibleFields] = useState<Set<string>|null>(null)
  const [density,       setDensity]       = useState<TableDensity>(() => loadDensity(defaultDensity))
  const [emailOpen,     setEmailOpen]     = useState(false)
  const [expandedRows,  setExpandedRows]  = useState<Set<string>>(new Set())
  const [activePreset,  setActivePreset]  = useState<string|undefined>()
  const [contextMenu,   setContextMenu]   = useState<ContextMenuState<TData>|null>(null)
  const [focusedIdx,    setFocusedIdx]    = useState(-1)
  const tableRef = useRef<HTMLTableElement>(null)

  const { state, setState } = useUrlState({
    page: 0, pageSize: defaultPageSize,
    sortBy: defaultSortBy, sortDir: defaultSortDir as string,
  })

  const [filters,    setFilters]    = useState<Record<string,unknown>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected,   setSelected]   = useState<TData[]>([])
  const [exporting,  setExporting]  = useState(false)

  const gridParams: GridParams = {
    page: state.page as number, pageSize: state.pageSize as number,
    sortBy: state.sortBy as string, sortDir: state.sortDir as 'asc'|'desc',
    filters,
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKey, gridParams],
    queryFn:  () => queryFn(gridParams),
    placeholderData: keepPreviousData,
  })

  const rows  = (data as {content?:TData[]}|undefined)?.content ?? []
  const total = (data as {totalElements?:number}|undefined)?.totalElements ?? 0

  useEffect(() => { setFocusedIdx(-1) }, [rows])

  // ── Column ordering ──────────────────────────────────────────────────────────
  // colOrder holds indices into the base columns array
  const baseVisible = visibleFields
    ? columns.filter(c => visibleFields.has(String(c.field)))
    : columns

  useEffect(() => {
    if (colOrder.length !== baseVisible.length) {
      setColOrder(baseVisible.map((_, i) => i))
    }
  }, [baseVisible.length]) // eslint-disable-line

  const orderedCols: ColumnDef<TData>[] = colOrder.length === baseVisible.length
    ? colOrder.map(i => baseVisible[i]).filter(Boolean) as ColumnDef<TData>[]
    : baseVisible as ColumnDef<TData>[]

  function handleDragStart(i: number) { setDragFrom(i) }
  function handleDragOver(i: number)  { setDragOver(i) }
  function handleDrop(i: number) {
    if (dragFrom === null || dragFrom === i) { setDragFrom(null); setDragOver(null); return }
    const next = [...colOrder]
    const [moved] = next.splice(dragFrom, 1)
    next.splice(i, 0, moved)
    setColOrder(next)
    setDragFrom(null); setDragOver(null)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: string) => {
    if (!isSortingBackend) return
    setState({
      sortBy:  field,
      sortDir: state.sortBy === field && state.sortDir === 'asc' ? 'desc' : 'asc',
      page:    0,
    })
  }, [state.sortBy, state.sortDir, setState, isSortingBackend])

  const handleSearch = useCallback((f: Record<string,unknown>) => {
    setFilters(f); setState({ page: 0 })
  }, [setState])

  const handleRowClick = useCallback((row: TData) => {
    if (onRowClick) { onRowClick(row); return }
    if (detailPath) navigate(detailPath(row))
  }, [onRowClick, detailPath, navigate])

  const handleExport = useCallback(async () => {
    if (!exportFn) return
    setExporting(true)
    try { downloadBlob(await exportFn(gridParams), exportFilename) }
    catch { logger.error('DataGrid','Export failed') }
    finally { setExporting(false) }
  }, [exportFn, gridParams, exportFilename])

  const handleContextMenu = useCallback((e: React.MouseEvent, row: TData) => {
    if (!rowMenuItems) return
    e.preventDefault()
    setContextMenu({ row, x: e.clientX, y: e.clientY })
  }, [rowMenuItems])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) return  // let editor handle keys
    if (!rows.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i+1, rows.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i-1, 0)) }
    else if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); handleRowClick(rows[focusedIdx]) }
    else if (e.key === 'Escape') { setFocusedIdx(-1); setContextMenu(null) }
    else if ((e.ctrlKey||e.metaKey) && e.key === 'c' && focusedIdx >= 0) {
      e.preventDefault()
      const row = rows[focusedIdx]
      const field = orderedCols[0]?.field
      const value = field ? String(row[field as keyof TData] ?? '') : ''
      navigator.clipboard.writeText(value).then(() => toast.info(`Copied: ${value.slice(0,40)}`))
    }
  }, [rows, focusedIdx, handleRowClick, orderedCols, editingCell])

  function toggleExpansion(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  const activeFilterCount = Object.values(filters).filter(v => v != null && v !== '').length
  const rowPy = DENSITY_PY[density]
  const colCount = orderedCols.length + (hasRowSelection?1:0) + (rowMenuItems?1:0) + (rowExpansion?1:0)

  // ── Mobile ──────────────────────────────────────────────────────────────────
  if (isMobile && rows.length > 0 && !isLoading) {
    return (
      <Box>
        <DataGridToolbar
          hasExport={hasExport && !!exportFn} hasFilters={hasFilters}
          filterOpen={filterOpen} activeFilterCount={activeFilterCount}
          exporting={exporting} selected={selected} bulkActions={bulkActions}
          onToggleFilter={() => setFilterOpen(v => !v)}
          onExport={exportFn ? handleExport : undefined}
          onRefresh={() => refetch()}
        />
        {hasFilters && FilterPanel && (
          <Collapse in={filterOpen}>
            <Paper variant="outlined" sx={{ p:2, mb:1, borderRadius:2 }}>
              <FilterPanel onSearch={handleSearch} onReset={() => { setFilters({}); setState({ page:0 }) }} filters={filters} />
            </Paper>
          </Collapse>
        )}
        <MobileCardList
          rows={rows}
          columns={orderedCols as ColumnDef<unknown>[]}
          onRowClick={(detailPath||onRowClick) ? handleRowClick : undefined}
          getRowKey={row => String(row[rowKey] ?? '')}
        />
        {isPaginated && (
          <Pagination
            page={state.page as number} pageSize={state.pageSize as number} total={total}
            onPageChange={p => setState({ page:p })}
            onPageSizeChange={s => setState({ pageSize:s, page:0 })}
          />
        )}
      </Box>
    )
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1, gap:1 }}>
        <DataGridToolbar
          hasExport={hasExport && !!exportFn} hasFilters={hasFilters}
          filterOpen={filterOpen} activeFilterCount={activeFilterCount}
          exporting={exporting} selected={selected} bulkActions={bulkActions}
          onToggleFilter={() => setFilterOpen(v => !v)}
          onExport={exportFn ? handleExport : undefined}
          onRefresh={() => refetch()}
        />
        <Box sx={{ display:'flex', gap:0.5, alignItems:'center', ml:'auto' }}>
          {hasEmail && emailConfig && (
            <Button size="small" variant="outlined" onClick={() => setEmailOpen(true)} sx={{ fontSize:12 }}>
              Send by email
            </Button>
          )}
          <DensityToggle value={density} onChange={setDensity} />
          <ColumnVisibilityToggle
            columns={columns as ColumnDef<unknown>[]}
            queryKey={Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey)}
            onChange={fields => { setVisibleFields(fields); setColOrder([]) }}
          />
        </Box>
      </Box>

      {filterPresets.length > 0 && (
        <FilterPresetsBar
          presets={filterPresets} activePresetId={activePreset}
          onSelect={p => { setActivePreset(p.id); setFilters(p.filters); setState({ page:0 }) }}
          onClear={() => { setActivePreset(undefined); setFilters({}); setState({ page:0 }) }}
        />
      )}

      {hasFilters && FilterPanel && (
        <Collapse in={filterOpen}>
          <Paper variant="outlined" sx={{ p:2, mb:1, borderRadius:2 }}>
            <FilterPanel onSearch={handleSearch} onReset={() => { setFilters({}); setState({ page:0 }) }} filters={filters} />
          </Paper>
        </Collapse>
      )}

      {!filterOpen && activeFilterCount > 0 && (
        <ActiveFilterChips
          filters={filters}
          onRemove={key => { const n={...filters}; delete n[key]; setFilters(n) }}
          onClearAll={() => setFilters({})}
        />
      )}

      {(detailPath||onRowClick) && rows.length > 0 && !isLoading && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', mb:0.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize:10 }}>
            ↑↓ navigate · Enter open · Ctrl+C copy · right-click for actions
            {reorderableColumns && ' · drag column headers to reorder'}
          </Typography>
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb:1 }}
          action={<Button onClick={() => refetch()} size="small">Retry</Button>}>
          {(error as Error)?.message ?? 'Failed to load data. Please try again.'}
        </Alert>
      )}

      {!isLoading && total > 0 && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', mb:0.5 }}>
          <Typography variant="caption" color="text.disabled">
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius:2 }}>
        <Table
          ref={tableRef}
          size="small"
          stickyHeader
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{ outline:'none' }}
        >
          <TableHead>
            <TableRow>
              {rowExpansion    && <TableCell width={40} />}
              {hasRowSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={e => setSelected(e.target.checked ? [...rows] : [])}
                  />
                </TableCell>
              )}
              {orderedCols.map((col, i) => (
                <ColumnHeader
                  key={String(col.field)}
                  column={col}
                  sortBy={state.sortBy as string}
                  sortDir={state.sortDir as 'asc'|'desc'}
                  onSort={handleSort}
                  index={i}
                  reorderable={reorderableColumns}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOver === i}
                />
              ))}
              {rowMenuItems && <TableCell width={48} />}
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <SkeletonRows colCount={colCount} rowCount={10} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py:6 }}>
                  {emptyState ?? (
                    <Typography color="text.secondary" variant="body2">
                      {activeFilterCount > 0 ? 'No results match your filters' : 'No records found'}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ) : rows.map((row, idx) => {
              const rowId      = String(row[rowKey] ?? idx)
              const isSelected = selected.some(r => r[rowKey] === row[rowKey])
              const isFocused  = focusedIdx === idx
              const zebraBg    = zebraStriping && idx % 2 === 1 ? 'action.hover' : 'transparent'

              return (
                <TableRow
                  key={rowId}
                  hover
                  selected={isSelected}
                  onClick={() => {
                    setFocusedIdx(idx)
                    if (editingCell) return
                    if (detailPath || onRowClick) handleRowClick(row)
                  }}
                  onContextMenu={e => handleContextMenu(e, row)}
                  sx={{
                    cursor: (detailPath||onRowClick) ? 'pointer' : 'default',
                    bgcolor: zebraBg,
                    outline: isFocused ? '2px solid' : 'none',
                    outlineColor: 'primary.main',
                    outlineOffset: '-2px',
                  }}
                >
                  {rowExpansion && (
                    <TableCell padding="checkbox"
                      onClick={e => { e.stopPropagation(); toggleExpansion(rowId) }}
                      sx={{ py:rowPy }}>
                      <Typography variant="caption" sx={{ cursor:'pointer', userSelect:'none', color:'text.secondary' }}>
                        {expandedRows.has(rowId) ? '▾' : '▸'}
                      </Typography>
                    </TableCell>
                  )}
                  {hasRowSelection && (
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()} sx={{ py:rowPy }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={e => setSelected(prev =>
                          e.target.checked ? [...prev, row] : prev.filter(r => r[rowKey] !== row[rowKey])
                        )}
                      />
                    </TableCell>
                  )}
                  {orderedCols.map(col => {
                    const field = col.field as keyof TData
                    const value = row[field]
                    const cellKey = `${rowId}-${String(col.field)}`
                    const isEditing = editingCell?.rowId === rowId && editingCell?.field === String(col.field)

                    const sticky = col.sticky
                      ? { position:'sticky' as const, [col.sticky]:0, bgcolor:'background.paper', zIndex:1 }
                      : {}

                    return (
                      <TableCell
                        key={String(col.field)}
                        align={col.align ?? 'left'}
                        onDoubleClick={() => {
                          if (!col.editable) return
                          setEditingCell({ rowId, field: String(col.field), value: String(value ?? '') })
                        }}
                        sx={{ width:col.width, minWidth:col.minWidth, py:rowPy, ...sticky }}
                      >
                        {isEditing ? (
                          <InlineCellEditor
                            value={editingCell!.value}
                            onCommit={async newVal => {
                              await col.onEdit?.(row, String(col.field), newVal)
                              setEditingCell(null)
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : col.renderCell ? (
                          col.renderCell(value, row)
                        ) : (
                          String(value ?? '—')
                        )}
                      </TableCell>
                    )
                  })}
                  {rowMenuItems && (
                    <TableCell align="right" onClick={e => e.stopPropagation()} sx={{ py:rowPy }}>
                      <RowMenu items={rowMenuItems(row)} row={row} />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {/* Expansion rows — separate pass to avoid Fragment-in-TableBody */}
            {rowExpansion && rows.map((row, idx) => {
              const rowId = String(row[rowKey] ?? idx)
              if (!expandedRows.has(rowId)) return null
              return (
                <TableRow key={`${rowId}-exp`} sx={{ bgcolor:'action.selected' }}>
                  <TableCell colSpan={colCount} sx={{ py:1.5, px:3 }}>
                    {rowExpansion.render(row)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {isPaginated && (
        <Pagination
          page={state.page as number} pageSize={state.pageSize as number} total={total}
          onPageChange={p => setState({ page:p })}
          onPageSizeChange={s => setState({ pageSize:s, page:0 })}
        />
      )}

      {hasEmail && emailConfig && (
        <EmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} config={emailConfig} />
      )}

      {contextMenu && rowMenuItems && (
        <ContextMenu
          items={rowMenuItems(contextMenu.row).filter(item => !item.hidden?.(contextMenu.row))}
          row={contextMenu.row}
          x={contextMenu.x} y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </Box>
  )
}
