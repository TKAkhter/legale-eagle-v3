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
    note: "PDF export omits activity line items when invoice has more than 20 rows.",
    issueImages: [],
    assignedTo: { id: "u1", firstName: "Sarah", lastName: "Johnson" },
    comments: [
      {
        id: "c1",
        comment: "Reproduced on Chrome — export truncates after page 1.",
        createdByName: "Talha Akhter",
        createdAt: "2026-05-10T11:00:00",
      },
      {
        id: "c2",
        comment: "Looking into the PDF renderer template.",
        createdByName: "Sarah Johnson",
        createdAt: "2026-05-11T09:30:00",
        parentId: "c1",
      },
    ],
  },
  {
    id: "t2",
    createdByName: "Sarah Johnson",
    createdDate: "2026-05-12T14:30:00",
    issueRelatedTo: "Matters",
    title: "Cannot reopen matter",
    url: "/matters/m1",
    status: "UnderProcess",
    note: "Reopen button stays disabled after close with reason Settled.",
    issueImages: [],
    assignedTo: { id: "u2", firstName: "James", lastName: "Williams" },
    comments: [],
  },
  {
    id: "t3",
    createdByName: "Priya Sharma",
    createdDate: "2026-04-01T09:00:00",
    issueRelatedTo: "Task",
    title: "Task submit hangs",
    url: "/tasks/t1",
    status: "Resolved",
    note: "Fixed by increasing upload timeout.",
    issueImages: [],
    assignedTo: null,
    comments: [
      {
        id: "c3",
        comment: "Confirmed fixed in prod.",
        createdByName: "Priya Sharma",
        createdAt: "2026-04-05T16:00:00",
      },
    ],
  },
]

export const TICKET_STATUSES = ["Initiated", "UnderProcess", "Resolved", "ReOpen"] as const

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

  async getById(ticketId: string): Promise<Record<string, unknown>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const found = STATIC_TICKETS.find(t => String(t.id) === ticketId)
      if (!found) throw new Error("Ticket not found")
      return { ...found }
    }
    const res = await axiosClient.get("/api/account/ticket/get/details", {
      params: { ticketId },
    })
    return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
  },

  async changeStatus(ticketId: string, ticketStatus: string): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      const row = STATIC_TICKETS.find(t => String(t.id) === ticketId)
      if (row) row.status = ticketStatus
      return
    }
    await axiosClient.put("/api/account/ticket/change/status", null, {
      params: { ticketId, ticketStatus },
    })
  },

  /** Assign ticket owner (`PUT /api/account/ticket/assign`). */
  async assign(ticketId: string, userId: string): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      const row = STATIC_TICKETS.find(t => String(t.id) === ticketId)
      if (row) {
        row.assignedTo = { id: userId, firstName: "Assigned", lastName: "User" }
      }
      return
    }
    await axiosClient.put("/api/account/ticket/assign", null, {
      params: { ticketId, assignTo: userId },
    })
  },

  /** Add comment/reply (`POST /api/account/ticket/comment/add`). */
  async addComment(ticketId: string, comment: string, parentId?: string): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      const row = STATIC_TICKETS.find(t => String(t.id) === ticketId)
      if (row) {
        const list = (Array.isArray(row.comments) ? row.comments : []) as Record<string, unknown>[]
        list.push({
          id: `c${Date.now()}`,
          comment,
          parentId: parentId || undefined,
          createdByName: "You",
          createdAt: new Date().toISOString(),
        })
        row.comments = list
      }
      return
    }
    await axiosClient.post("/api/account/ticket/comment/add", {
      ticketId,
      comment,
      parentId: parentId || undefined,
    })
  },

  async create(data: Record<string, unknown>): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      STATIC_TICKETS.unshift({
        id: `t${Date.now()}`,
        createdByName: "You",
        createdDate: new Date().toISOString(),
        issueRelatedTo: data.issueRelatedTo ?? "",
        title: data.title ?? "",
        url: data.url ?? "",
        status: "Initiated",
        note: data.note ?? data.description ?? "",
        issueImages: data.issueImages ?? [],
        assignedTo: null,
        comments: [],
      })
      return
    }
    await axiosClient.post("/api/account/ticket/add", data)
  },
}
