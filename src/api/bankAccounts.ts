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

/** In-memory rows for static mode so create/edit/delete round-trip. */
let staticBankAccounts: Record<string, unknown>[] = [
  { id: "ba1", accountName: "Operating Account", accountNumber: "1234567890", accountType: "Current", bankName: "Emirates NBD", currency: "AED", defaultAccount: true, openingBalance: 50000, active: true },
  { id: "ba2", accountName: "Client Trust", accountNumber: "9876543210", accountType: "Savings", bankName: "Mashreq", currency: "AED", defaultAccount: false, openingBalance: 120000, active: true },
]

export const bankAccountsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const filtered = q
        ? staticBankAccounts.filter(r =>
          String(r.accountName ?? "").toLowerCase().includes(q)
          || String(r.bankName ?? "").toLowerCase().includes(q))
        : staticBankAccounts
      return pageOf(filtered, p)
    }
    const res = await axiosClient.post("/api/bank/account/get")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    const q = String(p.filters?.searchText ?? "").toLowerCase()
    const filtered = q
      ? arr.filter(r => String(r.accountName ?? "").toLowerCase().includes(q)
        || String(r.bankName ?? "").toLowerCase().includes(q))
      : arr
    return pageOf(filtered.map((r, i) => ({ ...r, id: String(r.id ?? i) })), p)
  },

  async create(data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      const id = `ba${Date.now()}`
      if (data.defaultAccount) {
        staticBankAccounts = staticBankAccounts.map(a => ({ ...a, defaultAccount: false }))
      }
      staticBankAccounts = [...staticBankAccounts, { ...data, id, active: data.active !== false }]
      return "Bank account added."
    }
    const res = await axiosClient.post("/api/bank/account/add", data)
    return res.data?.Msg ?? res.data?.message ?? "Bank account added."
  },

  /** Update — LMS upserts via add with id when present. */
  async update(id: string, data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      if (data.defaultAccount) {
        staticBankAccounts = staticBankAccounts.map(a => ({
          ...a,
          defaultAccount: String(a.id) === id,
        }))
      }
      staticBankAccounts = staticBankAccounts.map(a =>
        String(a.id) === id ? { ...a, ...data, id } : a,
      )
      return "Bank account updated."
    }
    const res = await axiosClient.post("/api/bank/account/add", { ...data, id })
    return res.data?.Msg ?? res.data?.message ?? "Bank account updated."
  },

  async remove(id: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      staticBankAccounts = staticBankAccounts.filter(a => String(a.id) !== id)
      return "Bank account deleted."
    }
    try {
      const res = await axiosClient.delete("/api/bank/account/delete", { params: { id } })
      return res.data?.Msg ?? res.data?.message ?? "Bank account deleted."
    } catch {
      const res = await axiosClient.post("/api/bank/account/delete", null, { params: { id } })
      return res.data?.Msg ?? res.data?.message ?? "Bank account deleted."
    }
  },

  /** Mark account as the firm default (activate for payments). */
  async setDefault(id: string, account: Record<string, unknown>): Promise<string> {
    return bankAccountsApi.update(id, { ...account, id, defaultAccount: true, active: true })
  },

  async setActive(id: string, account: Record<string, unknown>, active: boolean): Promise<string> {
    return bankAccountsApi.update(id, { ...account, id, active })
  },

  async getTransactions(bankAccountId: string, pageNumber = 0, pageSize = 50) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "t1", transactionDate: "2026-08-01", description: "Opening balance", debit: 0, credit: 50000, balance: 50000 },
        { id: "t2", transactionDate: "2026-08-15", description: "Invoice payment INV-001", debit: 0, credit: 5000, balance: 55000 },
      ]
    }
    const res = await axiosClient.get("/api/account/transaction/get", {
      params: { bankAccountId, pageNumber, pageSize },
    })
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : (d?.content ?? [])
  },
}
