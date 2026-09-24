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

export const requestMattersApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        {
          id: "rm1",
          title: "Request — Building Dispute",
          practiceArea: "Litigation",
          billingType: "Hourly",
          status: "Pending",
          createdAt: "2026-08-10",
          client: { companyName: "Al Rashid Holdings", clientType: "COMPANY" },
          responsibleAttorney: { firstName: "Sarah", lastName: "Johnson" },
        },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/matter/matters", {
      params: { matterType: "Request_Matter", client: "" },
    })
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    return pageOf(arr.map(r => ({ ...r, id: String(r.id ?? r.matterId) })), p)
  },

  async getById(id: string): Promise<Record<string, unknown>> {
    if (env.USE_STATIC_DATA) {
      return { id, title: "Request — Building Dispute", billingType: "Hourly", clientId: "c1", responsibleAttorneyId: "u1" }
    }
    try {
      const res = await axiosClient.get("/api/matter/get/with/lfa/details", { params: { matterId: id } })
      return (res.data?.data ?? res.data) as Record<string, unknown>
    } catch {
      const res = await axiosClient.post("/api/matter/get/by/id", null, { params: { matterId: id } })
      return (res.data?.data ?? res.data) as Record<string, unknown>
    }
  },

  async create(payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return { id: "rm-new" } }
    const res = await axiosClient.post("/api/matter/add", { ...payload, matterType: "Request_Matter" })
    return res.data?.data ?? res.data
  },

  async update(id: string, payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.put(`/api/matter/update/v2/${id}`, { ...payload, matterType: "Request_Matter" })
  },
}

export const internalLeadsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        {
          id: "il1",
          name: "Internal Referral — Corporate",
          companyName: "Internal Desk",
          status: "Internal",
          leadType: "Company",
          createdAt: "2026-08-05",
        },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/leads/filter/list", {
      params: { leadType: "All", status: "Internal" },
    })
    const d = res.data?.data ?? res.data
    const list = Array.isArray(d) ? d : (d?.content ?? [])
    return pageOf((list as Record<string, unknown>[]).map(r => ({ ...r, id: String(r.id) })), p)
  },
}
