import { transformMatter } from '@/transformers/matter.transformer'
import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { matters as staticMatters } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

export const mattersApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q  = String(p.filters?.searchText ?? "").toLowerCase()
      const st = String(p.filters?.status ?? "")
      const bt = String(p.filters?.billingType ?? "")
      const filtered = staticMatters.filter(m =>
        (!q  || m.title.toLowerCase().includes(q) || (m.clientMini?.firstName ?? "").toLowerCase().includes(q)) &&
        (!st || m.status === st) &&
        (!bt || m.billingType === bt)
      )
      const start = p.page * p.pageSize
      const slice = filtered.slice(start, start + p.pageSize)
      return { content: slice as unknown as Record<string,unknown>[], totalElements: filtered.length, totalPages: Math.ceil(filtered.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= filtered.length, empty: slice.length === 0 }
    }
    const res = await axiosClient.post(
      `/api/report/matter/mini/filter/page/v2?pageNumber=${p.page}&pageSize=${p.pageSize}`,
      { attorney: [], procuredByIds: [], status: p.filters?.status ? [String(p.filters.status)] : ["OPEN","RE_OPEN"] }
    )
    const d = res.data?.data ?? res.data
    return { content: (d.content ?? []).map((raw: unknown) => transformMatter(raw as import('@/transformers/matter.transformer').RawMatter)), totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "m-new" } }
    const res = await axiosClient.post("/api/matter/add", data)
    return res.data?.data ?? res.data
  },
  async getById(matterId: string) {
    if (env.USE_STATIC_DATA) {
      const { matterDetail } = await import('@/data/static')
      return matterDetail
    }
    const res = await axiosClient.post('/api/matter/get/by/id', null, { params: { matterId } })
    return res.data?.data ?? res.data
  },
}
