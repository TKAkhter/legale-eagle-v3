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

export const bankAccountsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      const rows = [
        { id: "ba1", accountName: "Operating Account", accountNumber: "1234567890", accountType: "Current", bankName: "Emirates NBD", currency: "AED", defaultAccount: true, openingBalance: 50000 },
        { id: "ba2", accountName: "Client Trust", accountNumber: "9876543210", accountType: "Trust", bankName: "Mashreq", currency: "AED", defaultAccount: false, openingBalance: 120000 },
      ]
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const filtered = q
        ? rows.filter(r => r.accountName.toLowerCase().includes(q) || r.bankName.toLowerCase().includes(q))
        : rows
      return pageOf(filtered, p)
    }
    const res = await axiosClient.post("/api/bank/account/get")
    const list = (res.data?.data ?? res.data ?? []) as Record<string, unknown>[]
    const arr = Array.isArray(list) ? list : []
    const q = String(p.filters?.searchText ?? "").toLowerCase()
    const filtered = q
      ? arr.filter(r => String(r.accountName ?? "").toLowerCase().includes(q))
      : arr
    return pageOf(filtered.map((r, i) => ({ ...r, id: String(r.id ?? i) })), p)
  },

  async create(data: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Bank account added." }
    const res = await axiosClient.post("/api/bank/account/add", data)
    return res.data?.Msg ?? res.data?.message ?? "Bank account added."
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
