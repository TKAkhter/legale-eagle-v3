import { env }         from "@/config/env"
import { axiosClient, axiosBlob } from "@lib/api/axios"
import { invoices as staticInvoices } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

export const billingApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string,unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const s = p.filters?.invoiceStatus as string | undefined
      const filtered = staticInvoices.filter(i => !s || s === "All" || i.invoiceStatus === s)
      const start = p.page * p.pageSize
      const slice = filtered.slice(start, start + p.pageSize)
      return { content: slice as unknown as Record<string,unknown>[], totalElements: filtered.length, totalPages: Math.ceil(filtered.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= filtered.length, empty: slice.length === 0 }
    }
    const res = await axiosClient.post("/api/invoice/filter/all/v2", {}, {
      params: { pageNumber: p.page, pageSize: p.pageSize, clientId: p.filters?.clientId ?? "", invoiceStatus: p.filters?.invoiceStatus ?? "All", fromDate: p.filters?.fromDate ?? "", toDate: p.filters?.toDate ?? "" }
    })
    const d = res.data?.data ?? res.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },

  async getById(invoiceId: string) {
    if (env.USE_STATIC_DATA) return staticInvoices.find(i => i.id === invoiceId) ?? staticInvoices[0]
    const res = await axiosClient.get("/api/invoice/get/by/id", { params: { invoiceId } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "inv-new" } }
    const res = await axiosClient.post("/api/invoice/add", data)
    return res.data?.data ?? res.data
  },

  async recordPayment(invoiceId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/invoice/pay", { invoiceId, ...data })
  },

  async sendEmail(invoiceId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/invoice/send/email", null, { params: { invoiceId } })
  },

  async downloadPdf(invoiceId: string): Promise<Blob> {
    if (env.USE_STATIC_DATA) return new Blob(["%PDF mock"], { type: "application/pdf" })
    const res = await axiosBlob.get("/api/invoice/convert/pdf", { params: { invoiceId } })
    return res.data as Blob
  },

  async downloadWord(invoiceId: string): Promise<Blob> {
    if (env.USE_STATIC_DATA) return new Blob(["mock"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    const res = await axiosBlob.get("/api/invoice/convert/word", { params: { invoiceId } })
    return res.data as Blob
  },
}
