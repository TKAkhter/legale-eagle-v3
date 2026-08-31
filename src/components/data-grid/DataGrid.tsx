import React, { useState, useCallback, useRef, useEffect } from 'react'
/**
 * DataGrid.tsx — the core list component used throughout the app.
 *
 * Features:
 *   Filtering:        FilterPanel (collapsible), active filter chips, filter presets
 *   Sorting:          server-side or client-side, click column header
 *   Pagination:       rows-per-page selector (10/25/50/100), total count display
 *   Row actions:      3-dot row menu, bulk action toolbar, row click to detail
 *   Right-click menu: same actions as row menu, positioned at cursor  ← NEW Phase 28
 *   Keyboard nav:     ↑↓ to move, Enter to open detail, Esc to blur  ← NEW Phase 28
 *   Copy cell:        Ctrl+C on focused row copies first cell value   ← NEW Phase 28
 *   Export:           download Blob via exportFn, loading state
 *   Email:            send table data by email via EmailDialog
 *   Columns:          visibility toggle, density toggle (compact/normal/comfortable)
 *   Row expansion:    expandable content below each row
 *   Loading:          skeleton rows matching column layout
 *   Error:            error alert with retry button
 *   Mobile:           card-based layout on narrow screens (<640px)
 *   Zebra:            alternating row background colour
 *
 * Usage:
 *   <DataGrid
 *     columns={columns}
 *     queryKey={["leads","list"]}
 *     queryFn={(p) => leadsApi.getAll(p)}
 *     FilterPanel={LeadFilters}
 *     hasFilters zebraStriping
 *     detailPath={(row) => `/leads/${row.id}`}
 *     defaultSortBy="createdAt"
 *   />
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from '@mui/material'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Typography, Alert, Collapse, Button, Box, Tooltip,
} from '@mui/material'
import type { DataGridProps, TableDensity } from './types'
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
import { useUrlState }            from '@hooks/useUrlState'
import { downloadBlob }           from '@lib/utils/downloadBlob'
import { logger }                 from '@/lib/logger'
import { toast }                  from '@/lib/toast'

const DENSITY_PY: Record<TableDensity, number> = {
  compact:     0.25,
  normal:      0.75,
  comfortable: 1.5,
}

interface ContextMenuState<T> {
  row: T
  x:   number
  y:   number
}

export function DataGrid<TData extends Record<string, unknown>>({
  columns, queryKey, queryFn,
  FilterPanel, rowMenuItems, bulkActions, detailPath, exportFn,
  exportFilename = 'export.xlsx', emptyState, rowExpansion,
  emailConfig, filterPresets = [],
  isPaginated      = true,
  isSortingBackend = true,
  hasRowSelection  = false,
  hasExport        = false,
  hasFilters       = false,
  hasEmail         = false,
  syncWithUrl: _su = true,
  zebraStriping    = false,
  defaultDensity   = 'normal',
  defaultPageSize  = 25,
  defaultSortBy    = 'createdAt',
  defaultSortDir   = 'desc',
  onRowClick, rowKey = 'id' as keyof TData,
}: DataGridProps<TData>) {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width:639px)')

  // ── State ──────────────────────────────────────────────────────────────────
  const [visibleFields, setVisibleFields] = useState<Set<string>|null>(null)
  const [density,       setDensity]       = useState<TableDensity>(() => loadDensity(defaultDensity))
  const [emailOpen,     setEmailOpen]     = useState(false)
  const [expandedRows,  setExpandedRows]  = useState<Set<string>>(new Set())
  const [activePreset,  setActivePreset]  = useState<string|undefined>()
  const [contextMenu,   setContextMenu]   = useState<ContextMenuState<TData>|null>(null)

  // ── Keyboard navigation state ──────────────────────────────────────────────
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)
  const tableRef = useRef<HTMLTableElement>(null)

  const { state, setState } = useUrlState({
    page:     0,
    pageSize: defaultPageSize,
    sortBy:   defaultSortBy,
    sortDir:  defaultSortDir as string,
  })

  const [filters,    setFilters]    = useState<Record<string,unknown>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected,   setSelected]   = useState<TData[]>([])
  const [exporting,  setExporting]  = useState(false)

  const gridParams: GridParams = {
    page:     state.page     as number,
    pageSize: state.pageSize as number,
    sortBy:   state.sortBy   as string,
    sortDir:  state.sortDir  as 'asc'|'desc',
    filters,
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKey, gridParams],
    queryFn:  () => queryFn(gridParams),
    placeholderData: keepPreviousData,
  })

  const rows  = (data as {content?:TData[]}|undefined)?.content       ?? []
  const total = (data as {totalElements?:number}|undefined)?.totalElements ?? 0

  // Reset focused index when rows change
  useEffect(() => { setFocusedIdx(-1) }, [rows])

  // ── Visible columns ────────────────────────────────────────────────────────
  const visibleCols = visibleFields
    ? columns.filter(c => visibleFields.has(String(c.field)))
    : columns

  const colCount = visibleCols.length
    + (hasRowSelection ? 1 : 0)
    + (rowMenuItems    ? 1 : 0)
    + (rowExpansion    ? 1 : 0)

  // ── Handlers ───────────────────────────────────────────────────────────────
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
    catch { logger.error('DataGrid', 'Export failed') }
    finally { setExporting(false) }
  }, [exportFn, gridParams, exportFilename])

  /** Right-click on a row — show context menu */
  const handleContextMenu = useCallback((e: React.MouseEvent, row: TData) => {
    if (!rowMenuItems) return
    e.preventDefault()
    setContextMenu({ row, x: e.clientX, y: e.clientY })
  }, [rowMenuItems])

  /**
   * Keyboard navigation inside the table.
   * ↑↓   — move focused row
   * Enter — open detail (same as click)
   * Esc   — blur / close context menu
   * Ctrl+C — copy first column value of focused row
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!rows.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx(i => Math.min(i + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault()
      handleRowClick(rows[focusedIdx])
    } else if (e.key === 'Escape') {
      setFocusedIdx(-1)
      setContextMenu(null)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && focusedIdx >= 0) {
      e.preventDefault()
      const row   = rows[focusedIdx]
      const field = visibleCols[0]?.field
      const value = field ? String(row[field as keyof TData] ?? '') : ''
      navigator.clipboard.writeText(value).then(() => {
        toast.info(`Copied: ${value.length > 30 ? value.slice(0, 30) + '…' : value}`)
      })
    }
  }, [rows, focusedIdx, handleRowClick, visibleCols])

  function toggleExpansion(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  function applyPreset(preset: {id:string;filters:Record<string,unknown>}) {
    setActivePreset(preset.id); setFilters(preset.filters); setState({ page: 0 })
  }

  function clearPreset() {
    setActivePreset(undefined); setFilters({}); setState({ page: 0 })
  }

  const activeFilterCount = Object.values(filters).filter(v => v != null && v !== '').length
  const rowPy = DENSITY_PY[density]

  // ── Mobile card view ───────────────────────────────────────────────────────
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
            <Paper variant="outlined" sx={{ p: 2, mb: 1, borderRadius: 2 }}>
              <FilterPanel onSearch={handleSearch}
                onReset={() => { setFilters({}); setState({ page: 0 }) }}
                filters={filters} />
            </Paper>
          </Collapse>
        )}
        <MobileCardList
          rows={rows}
          columns={visibleCols as import('./types').ColumnDef<unknown>[]}
          onRowClick={(detailPath || onRowClick) ? handleRowClick : undefined}
          getRowKey={row => String(row[rowKey] ?? '')}
        />
        {isPaginated && (
          <Pagination
            page={state.page as number} pageSize={state.pageSize as number} total={total}
            onPageChange={p => setState({ page: p })}
            onPageSizeChange={s => setState({ pageSize: s, page: 0 })}
          />
        )}
      </Box>
    )
  }

  // ── Desktop / tablet table view ────────────────────────────────────────────
  return (
    <Box>
      {/* Toolbar */}
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
            columns={columns as import('./types').ColumnDef<unknown>[]}
            queryKey={Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey)}
            onChange={setVisibleFields}
          />
        </Box>
      </Box>

      {/* Filter presets */}
      {filterPresets.length > 0 && (
        <FilterPresetsBar presets={filterPresets} activePresetId={activePreset}
          onSelect={applyPreset} onClear={clearPreset} />
      )}

      {/* Filter panel */}
      {hasFilters && FilterPanel && (
        <Collapse in={filterOpen}>
          <Paper variant="outlined" sx={{ p:2, mb:1, borderRadius:2 }}>
            <FilterPanel onSearch={handleSearch}
              onReset={() => { setFilters({}); setState({ page: 0 }) }}
              filters={filters} />
          </Paper>
        </Collapse>
      )}

      {/* Active filter chips */}
      {!filterOpen && activeFilterCount > 0 && (
        <ActiveFilterChips
          filters={filters}
          onRemove={key => { const n={...filters}; delete n[key]; setFilters(n) }}
          onClearAll={() => setFilters({})}
        />
      )}

      {/* Keyboard nav hint */}
      {(detailPath || onRowClick) && rows.length > 0 && !isLoading && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', mb:0.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize:10 }}>
            ↑↓ navigate · Enter open · Ctrl+C copy · right-click for actions
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {isError && (
        <Alert severity="error" sx={{ mb:1 }}
          action={<Button onClick={() => refetch()} size="small">Retry</Button>}>
          {(error as Error)?.message ?? 'Failed to load data. Please try again.'}
        </Alert>
      )}

      {/* Record count */}
      {!isLoading && total > 0 && (
        <Box sx={{ display:'flex', justifyContent:'flex-end', mb:0.5 }}>
          <Typography variant="caption" color="text.disabled">
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {/* Table — tabIndex makes it keyboard-focusable */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius:2 }}>
        <Table
          ref={tableRef}
          size="small"
          stickyHeader
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{ outline:'none' }}
          aria-label="Data table — use arrow keys to navigate rows"
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
              {visibleCols.map(col => (
                <ColumnHeader key={String(col.field)} column={col}
                  sortBy={state.sortBy as string} sortDir={state.sortDir as 'asc'|'desc'}
                  onSort={handleSort} />
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
              const isExpanded = expandedRows.has(rowId)
              const isFocused  = focusedIdx === idx
              const zebraBg    = zebraStriping && idx % 2 === 1 ? 'action.hover' : 'transparent'

              return (
                <TableRow
                    hover
                    selected={isSelected}
                    onClick={() => { setFocusedIdx(idx); if (detailPath || onRowClick) handleRowClick(row) }}
                    onContextMenu={e => handleContextMenu(e, row)}
                    sx={{
                      cursor:  (detailPath || onRowClick) ? 'pointer' : 'default',
                      bgcolor: zebraBg,
                      // Keyboard focus highlight
                      outline: isFocused ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: '-2px',
                    }}
                    aria-selected={isSelected}
                  >
                    {/* Expansion toggle */}
                    {rowExpansion && (
                      <TableCell padding="checkbox"
                        onClick={e => { e.stopPropagation(); toggleExpansion(rowId) }}
                        sx={{ py:rowPy }}>
                        <Typography variant="caption"
                          sx={{ cursor:'pointer', userSelect:'none', color:'text.secondary' }}>
                          {isExpanded ? '▾' : '▸'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Row selection */}
                    {hasRowSelection && (
                      <TableCell padding="checkbox"
                        onClick={e => e.stopPropagation()} sx={{ py:rowPy }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={e => setSelected(prev =>
                            e.target.checked ? [...prev, row] : prev.filter(r => r[rowKey] !== row[rowKey])
                          )}
                        />
                      </TableCell>
                    )}

                    {/* Data cells */}
                    {visibleCols.map(col => {
                      const value = row[col.field as keyof TData]
                      return (
                        <TableCell key={String(col.field)}
                          align={col.align ?? 'left'}
                          sx={{ width:col.width, minWidth:col.minWidth, py:rowPy }}>
                          {col.renderCell ? col.renderCell(value, row) : String(value ?? '—')}
                        </TableCell>
                      )
                    })}

                    {/* Row menu */}
                    {rowMenuItems && (
                      <TableCell align="right" onClick={e => e.stopPropagation()} sx={{ py:rowPy }}>
                        <RowMenu items={rowMenuItems(row)} row={row} />
                      </TableCell>
                    )}
                  </TableRow>

              )
            })
          }
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {isPaginated && (
        <Pagination
          page={state.page as number} pageSize={state.pageSize as number} total={total}
          onPageChange={p => setState({ page: p })}
          onPageSizeChange={s => setState({ pageSize: s, page: 0 })}
        />
      )}

      {/* Email dialog */}
      {hasEmail && emailConfig && (
        <EmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} config={emailConfig} />
      )}

      {/* Right-click context menu */}
      {contextMenu && rowMenuItems && (
        <ContextMenu
          items={rowMenuItems(contextMenu.row).filter(
            item => !item.hidden?.(contextMenu.row)
          )}
          row={contextMenu.row}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </Box>
  )
}
