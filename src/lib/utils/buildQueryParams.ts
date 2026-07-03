/**
 * buildQueryParams.ts
 *
 * The LegalEagle backend uses THREE different pagination param conventions:
 *   A) page / size                      (e.g. /api/analytics endpoints)
 *   B) pageNumber / pageSize            (e.g. /api/leads, /api/report/*)
 *   C) pageNo / pageSize                (e.g. some task endpoints)
 *
 * This utility normalises the DataGrid's internal GridParams into whichever
 * convention a given endpoint expects. Every queryFn wrapper calls through here.
 *
 * Also handles the mixed POST+querystring pattern:
 *   Some endpoints take filter params in the query string AND a body object.
 *   buildPostWithQuery() splits them correctly for axios.
 */

import type { GridParams } from '@/types/common.types'

// ─── Pagination convention enum ───────────────────────────────────────────────

export type PaginationConvention = 'page-size' | 'pageNumber-pageSize' | 'pageNo-pageSize'

// ─── Normalise pagination params ──────────────────────────────────────────────

export function buildPaginationParams(
  params: Pick<GridParams, 'page' | 'pageSize'>,
  convention: PaginationConvention = 'pageNumber-pageSize',
): Record<string, number> {
  const { page, pageSize } = params

  switch (convention) {
    case 'page-size':
      return { page, size: pageSize }
    case 'pageNo-pageSize':
      return { pageNo: page, pageSize }
    case 'pageNumber-pageSize':
    default:
      return { pageNumber: page, pageSize }
  }
}

// ─── Normalise sort params ────────────────────────────────────────────────────

export interface SortConvention {
  sortByKey?: string      // param name for sort field  (default: 'sortBy')
  sortDirKey?: string     // param name for direction   (default: 'sortDirection')
  dirValues?: { asc: string; desc: string }  // some use 'ASC'/'DESC'
}

export function buildSortParams(
  params: { sortBy?: string; sortDir?: 'asc' | 'desc' },
  convention: SortConvention = {},
): Record<string, string> {
  const {
    sortByKey  = 'sortBy',
    sortDirKey = 'sortDirection',
    dirValues  = { asc: 'asc', desc: 'desc' },
  } = convention

  const result: Record<string, string> = {}
  if (params.sortBy)  result[sortByKey]  = params.sortBy
  if (params.sortDir) result[sortDirKey] = dirValues[params.sortDir]
  return result
}

// ─── Full grid params builder ─────────────────────────────────────────────────

export interface QueryParamConfig {
  paginationConvention?: PaginationConvention
  sortConvention?: SortConvention
  /** Filter fields to include as query params (others go to body) */
  queryFilterKeys?: string[]
}

export function buildQueryParams(
  gridParams: GridParams,
  config: QueryParamConfig = {},
): Record<string, unknown> {
  const {
    paginationConvention = 'pageNumber-pageSize',
    sortConvention       = {},
    queryFilterKeys      = [],
  } = config

  const pagination = buildPaginationParams(gridParams, paginationConvention)
  const sort       = buildSortParams(
    { sortBy: gridParams.sortBy, sortDir: gridParams.sortDir },
    sortConvention,
  )

  const filterParams: Record<string, unknown> = {}
  if (gridParams.filters && queryFilterKeys.length > 0) {
    queryFilterKeys.forEach((key) => {
      const val = gridParams.filters?.[key]
      if (val !== undefined && val !== null && val !== '') {
        filterParams[key] = val
      }
    })
  }

  return { ...pagination, ...sort, ...filterParams }
}

// ─── Mixed POST + query string builder ───────────────────────────────────────

/**
 * For endpoints like POST /api/leads/list/filter where:
 *   - Pagination, sort, and some filters go in the query string
 *   - A body DTO (e.g. LeadsListDTO { attorneyIds[], departmentIds[] }) goes in the body
 *
 * Usage:
 *   const { params, data } = buildPostWithQuery(gridParams, {
 *     queryKeys: ['firstName', 'pa', 'status', 'fromDate', 'toDate', 'pageNumber', 'pageSize', 'sortBy', 'sortDirection'],
 *     bodyKeys:  ['attorneyIds', 'departmentIds', 'procuredByIds'],
 *   })
 *   axiosClient.post('/api/leads/list/filter', data, { params })
 */
export function buildPostWithQuery(
  allParams: Record<string, unknown>,
  split: { queryKeys: string[]; bodyKeys: string[] },
): { params: Record<string, unknown>; data: Record<string, unknown> } {
  const params: Record<string, unknown> = {}
  const data: Record<string, unknown>   = {}

  Object.entries(allParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (split.queryKeys.includes(key)) {
      params[key] = value
    } else if (split.bodyKeys.includes(key)) {
      data[key] = value
    }
  })

  return { params, data }
}

// ─── Blob / Excel export param builder ────────────────────────────────────────

/**
 * Strips pagination from params for export calls — exports return all rows.
 */
export function buildExportParams(
  gridParams: GridParams,
  config: QueryParamConfig = {},
): Record<string, unknown> {
  const { page: _page, pageSize: _pageSize, ...rest } = gridParams
  return buildQueryParams({ ...rest, page: 0, pageSize: 100_000 }, config)
}

// ─── Date param helpers ───────────────────────────────────────────────────────

/** Format a Date or ISO string to the backend's expected YYYY-MM-DD format */
export function formatDateParam(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined
  if (typeof date === 'string') return date.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

/** Clean undefined/null/empty values from a params object */
export function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}
