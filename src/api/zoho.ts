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

export const zohoApi = {
  async getClients(p: GridParams & { zohoExists?: boolean; zohoClientId?: string } = { page: 0, pageSize: 10, sortBy: "createdAt", sortDir: "desc" }) {
    if (env.USE_STATIC_DATA) {
      const rows = [
        { clientId: "c1", id: "c1", clientName: "Al Rashid Holdings", clientType: "COMPANY", clientExternalId: "EXT-001", zohoClientId: "ZOHO-1001", status: "OPEN", openMatter: 3, closeMatter: 1, createdAt: "2026-01-10" },
        { clientId: "c2", id: "c2", clientName: "Emily Harper", clientType: "PERSON", clientExternalId: "EXT-002", zohoClientId: "", status: "OPEN", openMatter: 1, closeMatter: 0, createdAt: "2026-02-15" },
      ]
      return pageOf(rows, p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/client/zoho", {
      params: {
        page: p.page,
        size: p.pageSize,
        sortBy: p.sortBy ?? "createdAt",
        sortDir: (p.sortDir ?? "desc").toUpperCase(),
        zohoExists: f.zohoExists ?? true,
        clientId: f.clientId ?? "",
        status: f.status ?? "",
        zohoClientId: f.zohoClientId ?? "",
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (d.content ?? []) as Record<string, unknown>[]
    return {
      content: content.map(r => ({ ...r, id: String(r.clientId ?? r.id) })),
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? 1),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: content.length === 0,
    }
  },

  async updateZohoIds(rows: { clientId: string; zohoClientId: string }[]): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Zoho Client ID updated." }
    const res = await axiosClient.post("/api/client/add-update/zohoId", rows)
    return res.data?.Msg ?? res.data?.message ?? "Zoho Client ID updated."
  },

  async getIntegrationSettings() {
    if (env.USE_STATIC_DATA) {
      return {
        zohoCreateClient: true,
        zohoUpdateClient: true,
        zohoCreateInvoice: true,
        zohoUploadAttachment: false,
        zohoCreateCreditNote: true,
        zohoUploadCreditNoteAttachment: false,
        zohoCreateVendor: true,
        zohoUpdateVendor: true,
        lastUpdated: "2026-08-01",
      }
    }
    const res = await axiosClient.get("/api/settings/integration-settings")
    const list = res.data?.data ?? res.data
    return Array.isArray(list) ? list[0] ?? null : list
  },

  async getLedgers() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "l1", departmentId: "d1", departmentName: "Litigation", billingType: "Hourly", account_name: "Legal Fees", account_id: "ACC-001", tax_id: "TAX-5" },
      ]
    }
    const res = await axiosClient.get("/api/department-ledgers/all")
    return res.data?.data ?? res.data ?? []
  },

  async saveLedger(payload: Record<string, unknown>): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Ledger saved." }
    const res = await axiosClient.post("/api/department-ledgers/createorupdate", payload)
    return res.data?.Msg ?? res.data?.message ?? "Ledger saved."
  },

  async getDepartments() {
    if (env.USE_STATIC_DATA) return [{ id: "d1", name: "Litigation" }, { id: "d2", name: "Corporate" }]
    const res = await axiosClient.get("/api/util/list/department")
    return res.data?.data ?? res.data ?? []
  },
}
