/**
 * DataGrid.tsx — the core list component used throughout the app.
 *
 * Features (all optional, enabled via props):
 *   Filtering:     FilterPanel (collapsible), active filter chips, filter presets
 *   Sorting:       server-side or client-side, click column header
 *   Pagination:    rows-per-page selector (10/25/50/100), total count display
 *   Row actions:   3-dot row menu, bulk action toolbar, row click to detail
 *   Export:        download Blob via exportFn, loading state
 *   Email:         send table data by email via EmailDialog
 *   Columns:       visibility toggle, density toggle (compact/normal/comfortable)
 *   Row expansion: expandable content below each row
 *   Loading:       skeleton rows matching column layout
 *   Error:         error alert with retry button
 *   Mobile:        card-based layout on narrow screens (<640px)
 *   Zebra:         alternating row background colour
 *
 * Usage example:
 *   <DataGrid
 *     columns={columns}
 *     queryKey={["leads","list"]}
 *     queryFn={(p) => leadsApi.getAll(p)}
 *     FilterPanel={LeadFilters}
 *     hasFilters hasExport zebraStriping
 *     detailPath={(row) => `/leads/${row.id}`}
 *     defaultSortBy="createdAt"
 *   />
 */
import { useState, useCallback, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from '@mui/material'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Typography, Alert, Collapse, Button, Box, Chip,
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
import { useUrlState }            from '@hooks/useUrlState'
import { downloadBlob }           from '@lib/utils/downloadBlob'
import { logger }                 from '@/lib/logger'

/** Row height per density setting */
const DENSITY_PY: Record<TableDensity, number> = {
  compact:     0.25,
  normal:      0.75,
  comfortable: 1.5,
}

export function DataGrid<TData extends Record<string, unknown>>({
  columns, queryKey, queryFn,
  FilterPanel, rowMenuItems, bulkActions, detailPath, exportFn,
  exportFilename = 'export.xlsx', emptyState, rowExpansion,
  emailConfig, filterPresets = [],
  isPaginated    = true,
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
  const navigate  = useNavigate()
  const isMobile  = useMediaQuery('(max-width:639px)')

  // ── State ──────────────────────────────────────────────────────────────────
  const [visibleFields,  setVisibleFields]  = useState<Set<string>|null>(null)
  const [density,        setDensity]        = useState<TableDensity>(() => loadDensity(defaultDensity))
  const [emailOpen,      setEmailOpen]      = useState(false)
  const [expandedRows,   setExpandedRows]   = useState<Set<string>>(new Set())
  const [activePreset,   setActivePreset]   = useState<string | undefined>()

  const { state, setState } = useUrlState({
    page:     0,
    pageSize: defaultPageSize,
    sortBy:   defaultSortBy,
    sortDir:  defaultSortDir as string,
  })

  const [filters,    setFilters]    = useState<Record<string, unknown>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected,   setSelected]   = useState<TData[]>([])
  const [exporting,  setExporting]  = useState(false)

  const gridParams: GridParams = {
    page:    state.page    as number,
    pageSize:state.pageSize as number,
    sortBy:  state.sortBy   as string,
    sortDir: state.sortDir  as 'asc' | 'desc',
    filters,
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKey, gridParams],
    queryFn:  () => queryFn(gridParams),
    placeholderData: keepPreviousData,
  })

  const rows  = (data as { content?: TData[] }  | undefined)?.content       ?? []
  const total = (data as { totalElements?: number } | undefined)?.totalElements ?? 0

  // ── Visible columns (after column visibility toggle) ──────────────────────
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
    logger.debug('DataGrid', `Sort: ${field}`)
    setState({
      sortBy:  field,
      sortDir: state.sortBy === field && state.sortDir === 'asc' ? 'desc' : 'asc',
      page:    0,
    })
  }, [state.sortBy, state.sortDir, setState, isSortingBackend])

  const handleSearch = useCallback((f: Record<string, unknown>) => {
    logger.debug('DataGrid', 'Filters applied', f)
    setFilters(f)
    setState({ page: 0 })
  }, [setState])

  const handleRowClick = useCallback((row: TData) => {
    if (onRowClick) { onRowClick(row); return }
    if (detailPath) {
      logger.info('DataGrid', `Navigating to detail: ${detailPath(row)}`)
      navigate(detailPath(row))
    }
  }, [onRowClick, detailPath, navigate])

  const handleExport = useCallback(async () => {
    if (!exportFn) return
    setExporting(true)
    logger.info('DataGrid', 'Export started')
    try {
      const blob = await exportFn(gridParams)
      downloadBlob(blob, exportFilename)
      logger.info('DataGrid', 'Export complete')
    } catch (e) {
      logger.error('DataGrid', 'Export failed', e)
    } finally {
      setExporting(false)
    }
  }, [exportFn, gridParams, exportFilename])

  function toggleExpansion(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function applyPreset(preset: { id: string; filters: Record<string, unknown> }) {
    logger.info('DataGrid', `Preset applied: ${preset.id}`)
    setActivePreset(preset.id)
    setFilters(preset.filters)
    setState({ page: 0 })
  }

  function clearPreset() {
    setActivePreset(undefined)
    setFilters({})
    setState({ page: 0 })
  }

  const activeFilterCount = Object.values(filters).filter(v => v != null && v !== '').length
  const rowPy = DENSITY_PY[density]

  // ── Mobile card view ───────────────────────────────────────────────────────
  if (isMobile && rows.length > 0 && !isLoading) {
    return (
      <Box>
        {/* Toolbar still shows on mobile */}
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
              <FilterPanel
                onSearch={handleSearch}
                onReset={() => { setFilters({}); setState({ page: 0 }) }}
                filters={filters}
              />
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
            page={state.page as number}
            pageSize={state.pageSize as number}
            total={total}
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
      {/* Toolbar row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <DataGridToolbar
          hasExport={hasExport && !!exportFn} hasFilters={hasFilters}
          filterOpen={filterOpen} activeFilterCount={activeFilterCount}
          exporting={exporting} selected={selected} bulkActions={bulkActions}
          onToggleFilter={() => setFilterOpen(v => !v)}
          onExport={exportFn ? handleExport : undefined}
          onRefresh={() => refetch()}
        />
        {/* Right-side controls */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}>
          {hasEmail && emailConfig && (
            <Button size="small" variant="outlined" onClick={() => setEmailOpen(true)} sx={{ fontSize: 12 }}>
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
        <FilterPresetsBar
          presets={filterPresets}
          activePresetId={activePreset}
          onSelect={applyPreset}
          onClear={clearPreset}
        />
      )}

      {/* Collapsible filter panel */}
      {hasFilters && FilterPanel && (
        <Collapse in={filterOpen}>
          <Paper variant="outlined" sx={{ p: 2, mb: 1, borderRadius: 2 }}>
            <FilterPanel
              onSearch={handleSearch}
              onReset={() => { setFilters({}); setState({ page: 0 }) }}
              filters={filters}
            />
          </Paper>
        </Collapse>
      )}

      {/* Active filter chips (shown when panel is closed) */}
      {!filterOpen && activeFilterCount > 0 && (
        <ActiveFilterChips
          filters={filters}
          onRemove={key => { const n = { ...filters }; delete n[key]; setFilters(n) }}
          onClearAll={() => setFilters({})}
        />
      )}

      {/* Error state */}
      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 1 }}
          action={<Button onClick={() => refetch()} size="small">Retry</Button>}
        >
          {(error as Error)?.message ?? 'Failed to load data. Please try again.'}
        </Alert>
      )}

      {/* Record count */}
      {!isLoading && total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
          <Typography variant="caption" color="text.disabled">
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {/* Row expansion toggle column */}
              {rowExpansion && <TableCell width={40} />}

              {/* Row selection checkbox */}
              {hasRowSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={e => setSelected(e.target.checked ? [...rows] : [])}
                  />
                </TableCell>
              )}

              {/* Column headers */}
              {visibleCols.map(col => (
                <ColumnHeader
                  key={String(col.field)}
                  column={col}
                  sortBy={state.sortBy as string}
                  sortDir={state.sortDir as 'asc' | 'desc'}
                  onSort={handleSort}
                />
              ))}

              {/* Row menu column */}
              {rowMenuItems && <TableCell width={48} />}
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <SkeletonRows colCount={colCount} rowCount={10} />

            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 6 }}>
                  {emptyState ?? (
                    <Typography color="text.secondary" variant="body2">
                      {activeFilterCount > 0 ? 'No results match your filters' : 'No records found'}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>

            ) : rows.map((row, idx) => {
              const rowId    = String(row[rowKey] ?? idx)
              const isSelected = selected.some(r => r[rowKey] === row[rowKey])
              const isExpanded = expandedRows.has(rowId)

              // Zebra striping — alternate row background
              const zebraBg = zebraStriping && idx % 2 === 1
                ? 'action.hover'
                : 'transparent'

              return (
                <>
                  {/* Main row */}
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    onClick={() => (detailPath || onRowClick) && handleRowClick(row)}
                    sx={{
                      cursor:  (detailPath || onRowClick) ? 'pointer' : 'default',
                      bgcolor: zebraBg,
                      // Density — row padding via cell sx
                    }}
                  >
                    {/* Expansion toggle */}
                    {rowExpansion && (
                      <TableCell
                        padding="checkbox"
                        onClick={e => { e.stopPropagation(); toggleExpansion(rowId) }}
                        sx={{ py: rowPy }}
                      >
                        <Typography variant="caption" sx={{ cursor: 'pointer', userSelect: 'none', color: 'text.secondary' }}>
                          {isExpanded ? '▾' : '▸'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Row selection */}
                    {hasRowSelection && (
                      <TableCell padding="checkbox" onClick={e => e.stopPropagation()} sx={{ py: rowPy }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={e => setSelected(prev =>
                            e.target.checked
                              ? [...prev, row]
                              : prev.filter(r => r[rowKey] !== row[rowKey])
                          )}
                        />
                      </TableCell>
                    )}

                    {/* Data cells */}
                    {visibleCols.map(col => {
                      const value = row[col.field as keyof TData]
                      return (
                        <TableCell
                          key={String(col.field)}
                          align={col.align ?? 'left'}
                          sx={{ width: col.width, minWidth: col.minWidth, py: rowPy }}
                        >
                          {col.renderCell ? col.renderCell(value, row) : String(value ?? '—')}
                        </TableCell>
                      )
                    })}

                    {/* Row menu */}
                    {rowMenuItems && (
                      <TableCell
                        align="right"
                        onClick={e => e.stopPropagation()}
                        sx={{ py: rowPy }}
                      >
                        <RowMenu items={rowMenuItems(row)} row={row} />
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expansion row */}
                  {rowExpansion && isExpanded && (
                    <TableRow key={`${rowId}-expanded`} sx={{ bgcolor: 'action.selected' }}>
                      <TableCell colSpan={colCount} sx={{ py: 1.5, px: 3 }}>
                        {rowExpansion.render(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {isPaginated && (
        <Pagination
          page={state.page as number}
          pageSize={state.pageSize as number}
          total={total}
          onPageChange={p => setState({ page: p })}
          onPageSizeChange={s => setState({ pageSize: s, page: 0 })}
        />
      )}

      {/* Email dialog */}
      {hasEmail && emailConfig && (
        <EmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          config={emailConfig}
        />
      )}
    </Box>
  )
}
