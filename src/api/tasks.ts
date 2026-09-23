import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { tasks as staticTasks, matterTasks } from "@/data/static"
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

const allStatic = () => [
  ...staticTasks.map(t => ({ ...t, taskType: (t as { taskType?: string }).taskType ?? "Matter" })),
  ...matterTasks.map(t => ({ ...t, taskType: "Matter", priority: (t as { priority?: string }).priority ?? "Normal" })),
]

export const tasksApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    const eventType = String(f.eventType ?? "ALL")
    const taskStatus = String(f.taskStatus ?? "Pending")

    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q = String(f.searchText ?? "").toLowerCase()
      const filtered = allStatic().filter(t => {
        const status = String((t as { taskStatus?: string }).taskStatus ?? "")
        const type = String((t as { taskType?: string }).taskType ?? "")
        if (taskStatus && taskStatus !== "All" && status !== taskStatus) return false
        if (eventType && eventType !== "ALL" && type.toUpperCase() !== eventType.toUpperCase()) return false
        if (q && !String((t as { taskName?: string }).taskName ?? "").toLowerCase().includes(q)) return false
        return true
      })
      return pageOf(filtered as Record<string, unknown>[], p)
    }

    const res = await axiosClient.get("/api/task/get/individual/task/v2", {
      params: {
        eventType: eventType || "ALL",
        // Old LMS sends concrete statuses; "All" should be empty so BE does not filter.
        taskStatus: taskStatus === "All" ? "" : taskStatus,
        pageNumber: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy ?? "taskDeadLine",
        sortDir: p.sortDir ?? "asc",
        searchText: f.searchText ?? "",
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getById(taskId: string) {
    if (env.USE_STATIC_DATA) {
      return allStatic().find(t => String((t as { id?: string }).id) === taskId) ?? allStatic()[0]
    }
    const res = await axiosClient.get("/api/task/get/full/assign/task", { params: { taskId } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "t-new" } }
    const res = await axiosClient.post("/api/task/add", data)
    return res.data?.data ?? res.data
  },

  async update(taskId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/task/update/single/task", data, { params: { taskId } })
  },

  async delete(taskId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Task deleted." }
    const res = await axiosClient.put("/api/task/delete/task", {}, { params: { taskId } })
    return res.data?.Msg ?? res.data?.message ?? "Task deleted."
  },

  async approve(taskId: string, status: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/task/approve", { taskId, status })
  },

  async getApprovals(p: GridParams) {
    if (env.USE_STATIC_DATA) return this.getAll({ ...p, filters: { ...p.filters, taskStatus: "Pending" } })
    const res = await axiosClient.get("/api/task/get/type/approval", {
      params: {
        eventType: p.filters?.eventType ?? "ALL",
        approvalType: "post",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getTemplateParents() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "tpl1", taskUUId: "tpl1", templateTitle: "Matter Kickoff Template", taskCreatedByName: "Admin" },
        { id: "tpl2", taskUUId: "tpl2", templateTitle: "Litigation Checklist", taskCreatedByName: "Sarah Johnson" },
      ]
    }
    const res = await axiosClient.get("/api/task/get/template/parent")
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : []
  },

  async getTemplateFull(taskUUId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "tt1", title: "Conflict check", priority: "1", order: 0 },
        { id: "tt2", title: "Open matter checklist", priority: "0", order: 1 },
        { id: "tt3", title: "Send engagement letter", priority: "2", order: 2 },
      ]
    }
    const res = await axiosClient.get("/api/task/get/template/full", { params: { taskUUId } })
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : []
  },

  async createTemplate(data: { templateTitle: string; taskList: { title: string; priority: string; order: number }[] }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { taskUUId: "tpl-new" }
    }
    const res = await axiosClient.post("/api/task/add/template", data)
    return res.data?.data ?? res.data
  },

  async updateTemplateTask(taskId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.put(`/api/task/template/update/task/${taskId}`, data)
  },

  async reorderTemplateTasks(taskUUId: string, taskList: Record<string, unknown>[]) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.put(`/api/task/template/update/order/${taskUUId}`, { taskList })
  },
}
