import { transformTimelog, transformTimelogPage } from '@/transformers/timelog.transformer'
import { env }         from "@/config/env"
import { axiosClient } from "@/lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

export const timelogsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return { content: [], totalElements: 0, totalPages: 0, number: 0, size: p.pageSize, first: true, last: true, empty: true }
    }
    const res = await axiosClient.get("/api/activity/for-approval/by-user/v2", {
      params: { pageNumber: p.page, pageSize: p.pageSize, revenueStatus: p.filters?.revenueStatus ?? "DRAFT", userId: p.filters?.userId ?? "", matterId: p.filters?.matterId ?? "" }
    })
    const d = res.data?.data ?? res.data
    return { content: transformTimelogPage(d.content ?? [] as Record<string,unknown>[]) as unknown as Record<string,unknown>[], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "act-new" } }
    const res = await axiosClient.post("/api/activity/add/v2", data)
    return res.data?.data ?? res.data
  },

  async approve(activityIds: string[], status: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/activity/approve", { activityIds, status })
  },

  async getStopwatchInfo() {
    if (env.USE_STATIC_DATA) return { activityTimerStatus: "Idle" }
    const res = await axiosClient.get("/api/activity/stopwatch/info")
    return res.data?.data ?? res.data
  },
  async getForReview(p: import("@/types/common.types").GridParams): Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      const { timelogs: staticTL } = await import("@/data/static")
      return { content: staticTL as Record<string,unknown>[], totalElements: staticTL.length, totalPages: 1, number: 0, size: staticTL.length, first: true, last: true, empty: staticTL.length === 0 }
    }
    const f = p.filters ?? {}
    const r = await axiosClient.get("/api/activity/for-approval/by-user/v2", {
      params: { pageNumber: p.page, pageSize: p.pageSize, fromDate: f.fromDate ?? "", toDate: f.toDate ?? "" }
    })
    const d = r.data?.data ?? r.data
    return { content: transformTimelogPage(d.content ?? [] as Record<string,unknown>[]) as unknown as Record<string,unknown>[], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async getForApproval(p: import("@/types/common.types").GridParams): Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      const { timelogs: staticTL } = await import("@/data/static")
      return { content: staticTL as Record<string,unknown>[], totalElements: staticTL.length, totalPages: 1, number: 0, size: staticTL.length, first: true, last: true, empty: staticTL.length === 0 }
    }
    const f = p.filters ?? {}
    const r = await axiosClient.get("/api/activity/for-approval", {
      params: { pageNumber: p.page, pageSize: p.pageSize, fromDate: f.fromDate ?? "", toDate: f.toDate ?? "" }
    })
    const d = r.data?.data ?? r.data
    return { content: transformTimelogPage(d.content ?? [] as Record<string,unknown>[]) as unknown as Record<string,unknown>[], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async submitForApproval(activityIds: string[]): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.post("/api/activity/send/for/approval/to-attorney/v2", { activityIds })
  },

  async bulkApproveHod(activityIds: string[], status: string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.post("/api/activity/approve", { activityIds, status })
  },

}