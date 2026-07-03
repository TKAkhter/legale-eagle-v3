import { useState, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, Typography, Alert, Collapse, Button, Box } from '@mui/material'
import type { DataGridProps } from './types'
import type { GridParams } from '@/types/common.types'
import { Pagination } from './Pagination'
import { SkeletonRows } from './SkeletonRows'
import { ColumnHeader } from './ColumnHeader'
import { RowMenu } from './RowMenu'
import { ActiveFilterChips } from './ActiveFilterChips'
import { DataGridToolbar } from './DataGridToolbar'
import { useUrlState } from '@hooks/useUrlState'
import { downloadBlob } from '@lib/utils/downloadBlob'
import { axiosBlob } from '@lib/api/axios'

export function DataGrid<TData extends Record<string, unknown>>({
  columns, queryKey, queryFn,
  FilterPanel, rowMenuItems, bulkActions, detailPath, exportFn,
  exportFilename = 'export.xlsx', emptyState,
  isPaginated = true, isSortingBackend = true, hasRowSelection = false,
  hasExport = false, hasFilters = false, syncWithUrl: _su = true,
  defaultPageSize = 25, defaultSortBy = 'createdAt', defaultSortDir = 'desc',
  onRowClick, rowKey = 'id' as keyof TData,
}: DataGridProps<TData>) {
  const navigate = useNavigate()
  const { state, setState } = useUrlState({ page: 0, pageSize: defaultPageSize, sortBy: defaultSortBy, sortDir: defaultSortDir as string })
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<TData[]>([])
  const [exporting, setExporting] = useState(false)

  const gridParams: GridParams = {
    page: state.page as number,
    pageSize: state.pageSize as number,
    sortBy: state.sortBy as string,
    sortDir: state.sortDir as 'asc' | 'desc',
    filters,
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKey, gridParams],
    queryFn: () => queryFn(gridParams),
    placeholderData: keepPreviousData,
  })

  const rows = (data as { content?: TData[] } | undefined)?.content ?? []
  const total = (data as { totalElements?: number } | undefined)?.totalElements ?? 0
  const colCount = columns.length + (hasRowSelection ? 1 : 0) + (rowMenuItems ? 1 : 0)

  const handleSort = useCallback((field: string) => {
    if (!isSortingBackend) return
    setState({ sortBy: field, sortDir: state.sortBy === field && state.sortDir === 'asc' ? 'desc' : 'asc', page: 0 })
  }, [state.sortBy, state.sortDir, setState, isSortingBackend])

  const handleSearch = useCallback((f: Record<string, unknown>) => { setFilters(f); setState({ page: 0 }) }, [setState])

  const handleRowClick = useCallback((row: TData) => {
    if (onRowClick) { onRowClick(row); return }
    if (detailPath) navigate(detailPath(row))
  }, [onRowClick, detailPath, navigate])

  // FIX: exportFn receives gridParams and returns a Blob
  const handleExport = useCallback(async () => {
    if (!exportFn) return
    setExporting(true)
    try {
      const blob = await exportFn(gridParams)
      downloadBlob(blob, exportFilename)
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setExporting(false)
    }
  }, [exportFn, gridParams, exportFilename])

  const activeFilterCount = Object.values(filters).filter(v => v != null && v !== '').length

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
            <FilterPanel onSearch={handleSearch} onReset={() => { setFilters({}); setState({ page: 0 }) }} filters={filters} />
          </Paper>
        </Collapse>
      )}

      {!filterOpen && activeFilterCount > 0 && (
        <ActiveFilterChips
          filters={filters}
          onRemove={key => { const n = { ...filters }; delete n[key]; setFilters(n) }}
          onClearAll={() => setFilters({})}
        />
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 1 }} action={<Button onClick={() => refetch()} size="small">Retry</Button>}>
          {(error as Error)?.message ?? 'Failed to load data'}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {hasRowSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={e => setSelected(e.target.checked ? [...rows] : [])}
                  />
                </TableCell>
              )}
              {columns.map(col => (
                <ColumnHeader key={String(col.field)} column={col}
                  sortBy={state.sortBy as string} sortDir={state.sortDir as 'asc' | 'desc'}
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
                <TableCell colSpan={colCount} align="center" sx={{ py: 6 }}>
                  {emptyState ?? <Typography color="text.secondary" variant="body2">No records found</Typography>}
                </TableCell>
              </TableRow>
            ) : rows.map((row, idx) => {
              const isSelected = selected.some(r => r[rowKey] === row[rowKey])
              return (
                <TableRow key={String(row[rowKey] ?? idx)} hover selected={isSelected}
                  onClick={() => (detailPath || onRowClick) && handleRowClick(row)}
                  sx={{ cursor: (detailPath || onRowClick) ? 'pointer' : 'default' }}>
                  {hasRowSelection && (
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected}
                        onChange={e => setSelected(prev => e.target.checked ? [...prev, row] : prev.filter(r => r[rowKey] !== row[rowKey]))} />
                    </TableCell>
                  )}
                  {columns.map(col => {
                    const value = row[col.field as keyof TData]
                    return (
                      <TableCell key={String(col.field)} align={col.align ?? 'left'}
                        sx={{ width: col.width, minWidth: col.minWidth }}>
                        {col.renderCell ? col.renderCell(value, row) : String(value ?? '—')}
                      </TableCell>
                    )
                  })}
                  {rowMenuItems && (
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <RowMenu items={rowMenuItems(row)} row={row} />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

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
