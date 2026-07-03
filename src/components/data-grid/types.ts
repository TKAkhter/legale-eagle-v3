import type { ReactNode } from 'react'
import type { GridParams, PageResponse } from '@/types/common.types'

export interface ColumnDef<TData = unknown> {
  field:        keyof TData | string
  header:       string
  width?:       number | string
  minWidth?:    number
  sortKey?:     string           // backend sort param name
  align?:       'left' | 'right' | 'center'
  renderCell?:  (value: unknown, row: TData) => ReactNode
  permission?:  string           // hide column if user lacks this
  sticky?:      'left' | 'right'
  hidden?:      boolean
}

export interface RowMenuItem<TData = unknown> {
  label:      string
  icon?:      ReactNode
  permission?: string
  onClick:    (row: TData) => void
  color?:     'default' | 'error' | 'warning'
  divider?:   boolean
  hidden?:    (row: TData) => boolean
}

export interface InlineAction<TData = unknown> {
  field:      string            // renders in this column
  render:     (row: TData) => ReactNode
  permission?: string
}

export interface BulkAction<TData = unknown> {
  label:      string
  icon?:      ReactNode
  permission?: string
  onClick:    (selected: TData[]) => void
  color?:     'default' | 'error' | 'warning' | 'primary'
}

export type QueryFn<TData> = (params: GridParams) => Promise<PageResponse<TData>>
export type ExportFn       = (params: GridParams) => Promise<Blob>

export interface DataGridProps<TData = unknown> {
  // Required
  columns:          ColumnDef<TData>[]
  queryKey:         unknown[]
  queryFn:          QueryFn<TData>

  // Optional slots
  FilterPanel?:     React.ComponentType<FilterPanelProps>
  rowMenuItems?:    (row: TData) => RowMenuItem<TData>[]
  inlineActions?:   InlineAction<TData>[]
  bulkActions?:     BulkAction<TData>[]
  detailPath?:      (row: TData) => string
  exportFn?:        ExportFn
  exportFilename?:  string
  emptyState?:      ReactNode

  // Feature flags
  isPaginated?:     boolean
  isSortingBackend?:boolean
  hasRowSelection?: boolean
  hasExport?:       boolean
  hasFilters?:      boolean
  syncWithUrl?:     boolean
  defaultPageSize?: number
  defaultSortBy?:   string
  defaultSortDir?:  'asc' | 'desc'

  // Callbacks
  onRowClick?:      (row: TData) => void

  // Identity
  rowKey?:          keyof TData   // default: 'id'
}

export interface FilterPanelProps {
  onSearch: (filters: Record<string, unknown>) => void
  onReset:  () => void
  filters:  Record<string, unknown>
}
