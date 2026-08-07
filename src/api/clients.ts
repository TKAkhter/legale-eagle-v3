import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { clients as staticClients } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

export const clientsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const filtered = staticClients.filter(c =>
        !q || `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(q)
      )
      const start = p.page * p.pageSize
      const slice = filtered.slice(start, start + p.pageSize)
      return { content: slice as unknown as Record<string,unknown>[], totalElements: filtered.length, totalPages: Math.ceil(filtered.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= filtered.length, empty: slice.length === 0 }
    }
    const res = await axiosClient.get("/api/client/filter", {
      params: { pageNumber: p.page, pageSize: p.pageSize, searchText: p.filters?.searchText ?? "" }
    })
    const d = res.data?.data ?? res.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async getById(clientId: string) {
    if (env.USE_STATIC_DATA) return staticClients.find(c => c.id === clientId) ?? staticClients[0]
    const res = await axiosClient.get(`/api/client/get/by/company/${clientId}`)
    return res.data?.data ?? res.data
  },

  async search(query: string) {
    if (env.USE_STATIC_DATA) {
      const q = query.toLowerCase()
      return staticClients.filter(c => `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(q))
        .map(c => ({ id: c.id, companyName: c.companyName, firstName: c.firstName, lastName: c.lastName }))
    }
    const res = await axiosClient.get("/api/client/get/short-info", { params: { clientName: query, pageNumber: 0, pageSize: 50 } })
    return res.data?.content ?? res.data?.data?.content ?? []
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "c-new" } }
    const res = await axiosClient.post("/api/client/add", data)
    return res.data?.data ?? res.data
  },

  async update(clientId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/client/edit", { clientId, ...data })
  },
}
