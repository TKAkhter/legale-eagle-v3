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

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (!payload || typeof payload !== "object") return []
  const d = payload as Record<string, unknown>
  if (Array.isArray(d.content)) return d.content as Record<string, unknown>[]
  if (Array.isArray(d.data)) return d.data as Record<string, unknown>[]
  if (d.data && typeof d.data === "object") {
    const nested = d.data as Record<string, unknown>
    if (Array.isArray(nested.content)) return nested.content as Record<string, unknown>[]
  }
  return []
}

export const teamTemplatesApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        {
          id: "tt1",
          name: "Litigation Core Team",
          description: "Default litigation staffing",
          users: [
            { userId: "u1", userName: "Sarah Johnson", teamRoleName: "Lead Attorney" },
            { userId: "u2", userName: "John Smith", teamRoleName: "Associate" },
          ],
        },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/team-template/get/all", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    const rows = unwrapList(res.data?.data ?? res.data).map(r => ({
      ...r,
      id: String(r.id ?? r.templateId),
    }))
    return pageOf(rows, { ...p, page: 0 })
  },

  async getById(id: string) {
    if (env.USE_STATIC_DATA) {
      return {
        id,
        name: "Litigation Core Team",
        description: "Default litigation staffing",
        users: [
          { userId: "u1", userName: "Sarah Johnson", teamRoleId: "r1", teamRoleName: "Lead Attorney" },
        ],
      }
    }
    const res = await axiosClient.get("/api/team-template/get", { params: { id } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Team template created." }
    const res = await axiosClient.post("/api/team-template/add", data)
    if (res.data?.code && String(res.data.code) !== "200") throw new Error(res.data.Msg ?? "Failed")
    return res.data?.Msg ?? res.data?.message ?? "Team template created."
  },

  async update(id: string, data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Team template updated." }
    const res = await axiosClient.post("/api/team-template/update", { id, ...data })
    if (res.data?.code && String(res.data.code) !== "200") throw new Error(res.data.Msg ?? "Failed")
    return res.data?.Msg ?? res.data?.message ?? "Team template updated."
  },

  async delete(id: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Team Template deleted successfully." }
    const res = await axiosClient.delete("/api/team-template/delete", { params: { id } })
    if (res.data?.code && String(res.data.code) !== "200") {
      throw new Error(res.data.Msg ?? res.data.message ?? "Failed to delete team template.")
    }
    return res.data?.Msg ?? res.data?.message ?? "Team Template deleted successfully."
  },

  async getRoles() {
    if (env.USE_STATIC_DATA) return [{ id: "r1", name: "Lead Attorney" }, { id: "r2", name: "Associate" }]
    const res = await axiosClient.get("/api/team-role/get/all")
    return unwrapList(res.data?.data ?? res.data)
  },
}
