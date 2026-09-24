/**
 * Budgeting APIs — user cost cards and monthly budget cards (LMS budgeting screens).
 */
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export type CostHistoryEntry = {
  id?: string
  designation: string
  rate: number
  effectiveDate: string
  note?: string
}

export type CostCardRow = {
  id: string
  name: string
  designation: string
  rate: number
  effectiveDate: string
  recordId: string
  note: string
  history: CostHistoryEntry[]
  active?: boolean
  loginDisabled?: boolean
}

export type BudgetCardRow = {
  id: string
  userId: string
  amount: number
  month: number
  year: number
  createdAt?: string
  updatedAt?: string
  userName?: string
}

function parseDate(dateStr: string): string {
  if (!dateStr) return ""
  return String(dateStr).slice(0, 10)
}

function groupCostCards(all: Record<string, unknown>[]): CostCardRow[] {
  const grouped = all.reduce<Record<string, Record<string, unknown>[]>>((acc, item) => {
    const uid = String(item.userId ?? "")
    if (!uid) return acc
    if (!acc[uid]) acc[uid] = []
    acc[uid].push(item)
    return acc
  }, {})

  return Object.entries(grouped).map(([userId, entries]) => {
    const sorted = [...entries].sort(
      (a, b) => new Date(String(b.effectiveDate)).getTime() - new Date(String(a.effectiveDate)).getTime(),
    )
    const latest = sorted[0] ?? {}
    return {
      id: userId,
      name: String(latest.userName ?? latest.name ?? "—"),
      designation: String(latest.designationName ?? latest.designation ?? "—"),
      rate: Number(latest.costPerHour ?? latest.rate ?? 0),
      effectiveDate: parseDate(String(latest.effectiveDate ?? "")),
      recordId: String(latest.id ?? ""),
      note: String(latest.note ?? ""),
      history: sorted.slice(1).map(h => ({
        id: String(h.id ?? ""),
        designation: String(h.designationName ?? h.designation ?? "—"),
        rate: Number(h.costPerHour ?? h.rate ?? 0),
        effectiveDate: parseDate(String(h.effectiveDate ?? "")),
        note: String(h.note ?? ""),
      })),
      active: latest.active as boolean | undefined,
      loginDisabled: latest.loginDisabled as boolean | undefined,
    }
  })
}

export const budgetingApi = {
  async getAllCostCards(): Promise<CostCardRow[]> {
    if (env.USE_STATIC_DATA) {
      return [
        {
          id: "u1",
          name: "Sarah Johnson",
          designation: "Partner",
          rate: 350,
          effectiveDate: "2026-01-01",
          recordId: "cc1",
          note: "",
          history: [{ designation: "Partner", rate: 320, effectiveDate: "2025-01-01" }],
          active: true,
          loginDisabled: false,
        },
        {
          id: "u2",
          name: "Former Associate",
          designation: "Associate",
          rate: 180,
          effectiveDate: "2025-06-01",
          recordId: "cc2",
          note: "",
          history: [],
          active: false,
          loginDisabled: true,
        },
      ]
    }
    const res = await axiosClient.get("/api/user/cost-cards/all")
    const payload = res.data?.data ?? res.data ?? {}
    const all = (payload.allUserCostCards ?? payload.content ?? (Array.isArray(payload) ? payload : [])) as Record<string, unknown>[]
    return groupCostCards(all)
  },

  async saveCostCard(payload: {
    userId: string
    costPerHour: number
    effectiveDate: string
    note?: string
    id?: string
  }): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return
    }
    await axiosClient.post("/api/user/cost-cards/createorupdate", payload)
  },

  async getBudgetsByUser(userId: string): Promise<BudgetCardRow[]> {
    if (env.USE_STATIC_DATA) {
      const y = new Date().getFullYear()
      return [
        { id: "b1", userId, amount: 15000, month: 8, year: y, userName: "Demo User" },
        { id: "b2", userId, amount: 12000, month: 7, year: y, userName: "Demo User" },
      ]
    }
    const res = await axiosClient.get("/api/budget/get", {
      params: {
        userId,
        page: 0,
        size: 100,
        sortBy: "updatedAt",
        sortDirection: "desc",
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
    return content.map(entry => ({
      id: String(entry.id ?? ""),
      userId: String(entry.userId ?? userId),
      amount: Number(entry.amount ?? 0),
      month: Number(entry.month ?? 0),
      year: Number(entry.year ?? 0),
      createdAt: entry.createdAt != null ? String(entry.createdAt) : undefined,
      updatedAt: entry.updatedAt != null ? String(entry.updatedAt) : undefined,
    }))
  },

  async createBudget(payload: {
    userId: string
    amount: number
    month: number
    year: number
    createdAt?: string
  }): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return
    }
    await axiosClient.post("/api/budget/create", {
      accessScope: "string",
      amount: payload.amount,
      month: payload.month,
      userId: payload.userId,
      year: payload.year,
      createdAt: payload.createdAt ?? new Date().toISOString().slice(0, 10),
    })
  },

  async updateBudget(
    id: string,
    payload: { userId: string; amount: number; month: number; year: number },
  ): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return
    }
    await axiosClient.put(`/api/budget/update/${id}`, {
      accessScope: "string",
      amount: payload.amount,
      month: payload.month,
      userId: payload.userId,
      year: payload.year,
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  },

  async deleteBudget(id: string): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return
    }
    await axiosClient.delete(`/api/budget/delete/${id}`)
  },
}
