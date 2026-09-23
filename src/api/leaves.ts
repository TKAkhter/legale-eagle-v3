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

export const leavesApi = {
  async getMyLeaves(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        { id: "l1", fromDate: "2026-09-01", toDate: "2026-09-03", leaveType: { type: "Annual" }, description: "Family trip", leaveStatus: "Accepted" },
        { id: "l2", fromDate: "2026-10-10", toDate: "2026-10-11", leaveType: { type: "Sick" }, description: "Medical", leaveStatus: "Submitted" },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/leave/user/leaves")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    return pageOf(arr.map((r, i) => ({ ...r, id: String(r.id ?? i) })), p)
  },

  async getApplications(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        { id: "la1", fromDate: "2026-09-20", toDate: "2026-09-22", leaveType: { type: "Annual" }, description: "Travel", leaveStatus: "Submitted", leaveTakenByName: "Emily Harper" },
        { id: "la2", fromDate: "2026-09-15", toDate: "2026-09-15", leaveType: { type: "Sick" }, description: "Fever", leaveStatus: "Accepted", leaveTakenByName: "John Smith" },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/leave/list")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    return pageOf(arr.map((r, i) => ({ ...r, id: String(r.id ?? i) })), p)
  },

  async getLeaveTypes() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "lt1", type: "Annual", status: true },
        { id: "lt2", type: "Sick", status: true },
        { id: "lt3", type: "Unpaid", status: true },
      ]
    }
    const res = await axiosClient.get("/api/leave/list/type")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    return (Array.isArray(list) ? list : []).filter(o => o.status !== false)
  },

  async apply(data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Leave application submitted." }
    const res = await axiosClient.post("/api/leave/apply", data)
    return res.data?.Msg ?? res.data?.message ?? "Leave application submitted."
  },

  async process(leaveId: string, data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Leave processed." }
    const res = await axiosClient.post("/api/leave/accept/leave", data, { params: { leaveId } })
    return res.data?.Msg ?? res.data?.message ?? "Leave processed."
  },
}
