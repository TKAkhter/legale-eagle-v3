import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { leads as staticLeads } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

export const leadsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const s = p.filters?.currentStatus as string | undefined
      const filtered = staticLeads.filter(l =>
        (!q || `${l.firstName} ${l.lastName} ${l.companyName}`.toLowerCase().includes(q)) &&
        (!s || l.currentStatus === s)
      )
      const start = p.page * p.pageSize
      const slice = filtered.slice(start, start + p.pageSize)
      return { content: slice as unknown as Record<string,unknown>[], totalElements: filtered.length, totalPages: Math.ceil(filtered.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= filtered.length, empty: slice.length === 0 }
    }
    const res = await axiosClient.get("/api/leads/list/filter", {
      params: { pageNumber: p.page, pageSize: p.pageSize, firstName: p.filters?.searchText ?? "", currentStatus: p.filters?.currentStatus ?? "" }
    })
    const d = res.data?.data ?? res.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async getById(leadId: string) {
    if (env.USE_STATIC_DATA) return staticLeads.find(l => l.id === leadId) ?? staticLeads[0]
    const res = await axiosClient.get("/api/leads/get/single", { params: { leadId } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "l-new" } }
    const res = await axiosClient.post("/api/leads/add", data)
    return res.data?.data ?? res.data
  },

  async update(leadId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/edit", { leadId, ...data })
  },

  async convert(leadId: string, matter: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/convert", { leadId, matter })
  },

  async addFollowup(leadId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/add/followup", { leadId, ...data, files: [] })
  },

  async getFollowups(leadId: string) {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/leads/get/followup", { params: { leadId } })
    return res.data?.data ?? []
  },

  async writeOff(leadId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/get/lead/writeoff", { leadId })
  },
}
