/**
 * types.ts — TypeScript interfaces for the DataGrid component system.
 *
 * Design principle: strong typing everywhere so junior devs get autocomplete
 * and immediate feedback when they misuse the API.
 */
import type { ReactNode } from "react"
import type { GridParams, PageResponse } from "@/types/common.types"

// ─── Column definition ────────────────────────────────────────────────────────

export interface ColumnDef<TData = unknown> {
  /** Data key from the row object */
  field:        keyof TData | string
  /** Column header label */
  header:       string
  /** Fixed pixel width */
  width?:       number | string
  /** Minimum pixel width */
  minWidth?:    number
  /** Backend sort parameter name (omit to disable sorting for this column) */
  sortKey?:     string
  /** Text alignment in cells */
  align?:       "left" | "right" | "center"
  /** Custom cell renderer — receives (value, row) and returns ReactNode */
  renderCell?:  (value: unknown, row: TData) => ReactNode
  /** Hide this column if the user lacks this permission key */
  permission?:  string
  /** Pin column to edge (future: column pinning) */
  sticky?:      "left" | "right"
  /** Hidden by default (user can show via column visibility toggle) */
  hidden?:      boolean
  /** Allow inline editing of this cell — renders an input on double-click */
  editable?:    boolean
  /** Called when cell value is committed (Enter / blur) */
  onEdit?:      (row: unknown, field: string, newValue: string) => Promise<void> | void
}

// ─── Row actions ──────────────────────────────────────────────────────────────

export interface RowMenuItem<TData = unknown> {
  label:       string
  icon?:       ReactNode
  permission?: string
  onClick:     (row: TData) => void
  color?:      "default" | "error" | "warning"
  divider?:    boolean
  /** Return true to hide this item for a specific row */
  hidden?:     (row: TData) => boolean
}

export interface BulkAction<TData = unknown> {
  label:       string
  icon?:       ReactNode
  permission?: string
  onClick:     (selected: TData[]) => void
  color?:      "default" | "error" | "warning" | "primary"
}

// ─── Row expansion ────────────────────────────────────────────────────────────

export interface RowExpansionConfig<TData = unknown> {
  /** Return the expanded content for a row */
  render: (row: TData) => ReactNode
}

// ─── Filter presets ───────────────────────────────────────────────────────────

export interface FilterPreset {
  /** Unique key — used as localStorage key */
  id:      string
  /** Display label in the preset dropdown */
  label:   string
  /** The filter values this preset applies */
  filters: Record<string, unknown>
}

// ─── Table density ────────────────────────────────────────────────────────────

/** Controls row height — saved to localStorage per user */
export type TableDensity = "compact" | "normal" | "comfortable"

export const DENSITY_SIZE: Record<TableDensity, "small" | "medium"> = {
  compact:     "small",
  normal:      "small",
  comfortable: "medium",
}

export const DENSITY_PY: Record<TableDensity, number> = {
  compact:     0.25,
  normal:      0.75,
  comfortable: 1.5,
}

// ─── Email dialog ─────────────────────────────────────────────────────────────

export interface EmailConfig {
  /** Called to send the email — receives recipients, subject, body */
  onSend: (opts: { to: string[]; subject: string; body: string }) => Promise<void>
  /** Default subject line — can include template vars like "{{matterTitle}}" */
  defaultSubject?: string
  /** Default body */
  defaultBody?: string
}

// ─── Function types ───────────────────────────────────────────────────────────

export type QueryFn<TData>  = (params: GridParams) => Promise<PageResponse<TData>>
export type ExportFn        = (params: GridParams) => Promise<Blob>

// ─── Main props ───────────────────────────────────────────────────────────────

export interface DataGridProps<TData = unknown> {
  // ── Required ──────────────────────────────────────────────────────────────
  columns:   ColumnDef<TData>[]
  queryKey:  unknown[]
  queryFn:   QueryFn<TData>

  // ── Optional feature slots ────────────────────────────────────────────────
  /** Custom filter panel component (Option 2 — render prop pattern) */
  FilterPanel?:      React.ComponentType<FilterPanelProps>
  /** Row 3-dot menu items */
  rowMenuItems?:     (row: TData) => RowMenuItem<TData>[]
  /** Bulk action buttons shown when rows are selected */
  bulkActions?:      BulkAction<TData>[]
  /** Navigate to this path when a row is clicked */
  detailPath?:       (row: TData) => string
  /** Export function — receives current filters and returns Blob */
  exportFn?:         ExportFn
  exportFilename?:   string
  /** Custom empty state content */
  emptyState?:       ReactNode
  /** Row expansion config — renders expandable content below each row */
  rowExpansion?:     RowExpansionConfig<TData>
  /** Email dialog config — shows "Send by email" button in toolbar */
  emailConfig?:      EmailConfig
  /** Saved filter presets shown in the filter panel */
  filterPresets?:    FilterPreset[]

  // ── Feature flags ─────────────────────────────────────────────────────────
  isPaginated?:      boolean    // default: true
  isSortingBackend?: boolean    // default: true (false = client-side sort)
  hasRowSelection?:  boolean    // default: false
  hasExport?:        boolean    // default: false
  hasFilters?:       boolean    // default: false
  hasEmail?:         boolean    // default: false
  syncWithUrl?:      boolean    // default: true
  zebraStriping?:    boolean    // default: false — alternating row colours
  defaultDensity?:   TableDensity  // default: "normal"

  // ── Defaults ──────────────────────────────────────────────────────────────
  defaultPageSize?:  number     // default: 25
  defaultSortBy?:    string     // default: "createdAt"
  defaultSortDir?:   "asc" | "desc"  // default: "desc"

  // ── Callbacks ─────────────────────────────────────────────────────────────
  /** Custom row click handler (use detailPath for navigation, this for custom logic) */
  onRowClick?:       (row: TData) => void

  // ── Identity ──────────────────────────────────────────────────────────────
  /** Which field uniquely identifies rows — default: "id" */
  rowKey?:           keyof TData
  /** Allow columns to be dragged to reorder — default: false */
  reorderableColumns?: boolean
}

// ─── Filter panel props ───────────────────────────────────────────────────────

export interface FilterPanelProps {
  /** Call with filter values to trigger a search */
  onSearch:  (filters: Record<string, unknown>) => void
  /** Call to clear all filters */
  onReset:   () => void
  /** Current active filter values */
  filters:   Record<string, unknown>
}
