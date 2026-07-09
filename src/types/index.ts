export interface PaginatedResponse<T> {
  content: T[]; totalElements: number; totalPages: number
  number: number; size: number; first: boolean; last: boolean; empty: boolean
}
export interface GridParams {
  page: number; pageSize: number; sortBy: string; sortDir: "asc"|"desc"
  filters: Record<string, unknown>
}
