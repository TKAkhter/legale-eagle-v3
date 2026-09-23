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

function unwrapPage(data: unknown, p: GridParams): PageResponse<Record<string, unknown>> {
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

const STATIC_TICKETS: Record<string, unknown>[] = [
  {
    id: "t1",
    createdByName: "Talha Akhter",
    createdDate: "2026-05-10T10:00:00",
    issueRelatedTo: "Billing",
    title: "Invoice PDF missing line items",
    url: "/billings/inv-1",
    status: "Initiated",
  },
  {
    id: "t2",
    createdByName: "Sarah Johnson",
    createdDate: "2026-05-12T14:30:00",
    issueRelatedTo: "Matters",
    title: "Cannot reopen matter",
    url: "/matters/m1",
    status: "UnderProcess",
  },
]

export const ticketsApi = {
  async getAll(p: GridParams, completed = false): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const rows = STATIC_TICKETS.filter(t => {
        if (completed) return String(t.status) === "Resolved"
        return String(t.status) !== "Resolved"
      })
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/account/ticket/page", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        completed,
        createdBy: String(f.createdBy ?? ""),
        issueRelatedTo: String(f.issueRelatedTo ?? ""),
        ticketStatus: String(f.ticketStatus ?? ""),
        fromDate: String(f.fromDate ?? ""),
        toDate: String(f.toDate ?? ""),
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async create(data: Record<string, unknown>): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return
    }
    await axiosClient.post("/api/account/ticket/add", data)
  },
}
