import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { tasks as staticTasks } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

export const tasksApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const filtered = staticTasks
      const start = p.page * p.pageSize
      const slice = filtered.slice(start, start + p.pageSize)
      return { content: slice as unknown as Record<string,unknown>[], totalElements: filtered.length, totalPages: Math.ceil(filtered.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= filtered.length, empty: slice.length === 0 }
    }
    const res = await axiosClient.get("/api/task/get/all", { params: { pageNumber: p.page, pageSize: p.pageSize } })
    const d = res.data?.data ?? res.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "t-new" } }
    const res = await axiosClient.post("/api/task/add", data)
    return res.data?.data ?? res.data
  },

  async update(taskId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/task/edit", { taskId, ...data })
  },

  async approve(taskId: string, status: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/task/approve", { taskId, status })
  },
}
