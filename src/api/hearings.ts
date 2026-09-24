import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

function pageOf<T>(rows: T[], p: GridParams): PageResponse<T> {
  const start = p.page * p.pageSize
  const slice = rows.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= rows.length,
    empty: slice.length === 0,
  }
}

function unwrap(data: unknown, p: GridParams): PageResponse<Record<string, unknown>> {
  const d = (data ?? {}) as Record<string, unknown>
  const content = (Array.isArray(d.content) ? d.content
    : Array.isArray(d) ? d
    : Array.isArray(d.data) ? d.data
    : []) as Record<string, unknown>[]
  if (Array.isArray(d.content) || typeof d.totalElements === "number") {
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(content.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: Boolean(d.empty ?? content.length === 0),
    }
  }
  return pageOf(content, p)
}

const STATIC = [
  { id: "h1", hearingTitle: "CMC", matterTitle: "260303", hearingDate: "2026-09-25T10:00:00", location: "Dubai Courts", status: "Scheduled", caseNo: "C-100" },
  { id: "h2", hearingTitle: "Trial", matterTitle: "260293", hearingDate: "2026-08-01T09:00:00", location: "Abu Dhabi Courts", status: "Closed", caseNo: "C-200" },
]

export const hearingsApi = {
  async getList(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(STATIC as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/hearing/get/continue", {
      params: {
        hearingFromDate: f.fromDate ?? "",
        hearingToDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
        matterId: f.matterId ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getHistory(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(STATIC.filter(h => h.status === "Closed") as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/hearing/get/parent", {
      params: {
        matterId: f.matterId ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getUpcoming(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      return pageOf(STATIC.filter(h => h.status === "Scheduled") as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/hearing/for/attorney", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async continueHearing(data: FormData | Record<string, unknown>) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: "h-continued" }
    }
    const res = await axiosClient.post("/api/hearing/add/continue", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    })
    return res.data?.data ?? res.data
  },

  async closeHearing(hearingId: string, data: { closingDate?: string; decision?: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: hearingId }
    }
    const res = await axiosClient.put(`/api/hearing/close/${hearingId}`, { hearingId, ...data })
    return res.data?.data ?? res.data
  },

  async getParentChild(parentId: string) {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/hearing/get/parent/child", { params: { parentId } })
    return res.data?.data ?? res.data ?? []
  },
}
