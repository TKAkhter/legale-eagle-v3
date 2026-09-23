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

export const payrollApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        {
          id: "p1",
          basicAmount: 15000,
          payrollUser: { firstName: "Sarah", lastName: "Johnson" },
          grade: { name: "Senior Associate" },
          incomes: [{ amount: 2000, income: { name: "Housing" } }],
          deductions: [{ amount: 500, deduction: { name: "Tax" } }],
        },
      ]
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/payroll/list")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    return pageOf(arr.map((r, i) => ({ ...r, id: String(r.id ?? i) })), p)
  },

  async create(data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Payroll created." }
    const res = await axiosClient.post("/api/payroll/add", data)
    return res.data?.Msg ?? res.data?.message ?? "Payroll created."
  },

  async getIncomes() {
    if (env.USE_STATIC_DATA) return [{ id: "i1", name: "Housing", status: true }]
    const res = await axiosClient.get("/api/hr/master/list/income", { params: { status: true } })
    return res.data?.data ?? res.data ?? []
  },

  async getDeductions() {
    if (env.USE_STATIC_DATA) return [{ id: "d1", name: "Tax", status: true }]
    const res = await axiosClient.get("/api/hr/master/list/deduction")
    return res.data?.data ?? res.data ?? []
  },

  async getGrades() {
    if (env.USE_STATIC_DATA) return [{ id: "g1", name: "Senior Associate", basicSalary: 15000, status: true }]
    const res = await axiosClient.get("/api/hr/master/grade/list")
    return res.data?.data ?? res.data ?? []
  },

  async downloadPdf(id: string): Promise<Blob> {
    if (env.USE_STATIC_DATA) return new Blob(["%PDF mock"], { type: "application/pdf" })
    const res = await axiosClient.get("/api/payroll/pdf", { params: { id }, responseType: "blob" })
    return res.data as Blob
  },
}
