import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

export const lfaApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return { content: [], totalElements: 0, totalPages: 0, number: 0, size: p.pageSize, first: true, last: true, empty: true }
    }
    const res = await axiosClient.get("/api/lfa/filter/page", {
      params: { pageNumber: p.page, pageSize: p.pageSize, clientId: p.filters?.clientId ?? "", billingType: p.filters?.billingType ?? "" }
    })
    const d = res.data?.data ?? res.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "lfa-new" } }
    const res = await axiosClient.post("/api/lfa/add", data)
    return res.data?.data ?? res.data
  },

  async update(lfaId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/lfa/edit", { lfaId, ...data })
  },

  async approve(lfaId: string, status: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.patch(`/api/lfa/approve/${lfaId}/${status}`)
  },
}
