import { env } from "@/config/env"
import { axiosClient, axiosBlob } from "@lib/api/axios"
import { invoices as staticInvoices } from "@/data/static"
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

function enrichStaticInvoice(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    department: (row.department as string) ?? "Litigation",
    lfaNo: (row.lfaNo as string) ?? "LFA-2026-014",
    discountPercent: Number(row.discountPercent ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    taxPercent: Number(row.taxPercent ?? 5),
    writeOffAmount: Number(row.writeOffAmount ?? 0),
    creditNoteAmount: Number(row.creditNoteAmount ?? 0),
    amountDue: Number(row.balanceAmount ?? row.taxableAmount ?? 0),
    createdBy: (row.createdBy as string) ?? "Sarah Johnson",
    taxInvoiceNo: (row.taxInvoiceNo as string) ?? row.invoiceNo,
    lineItems: (row.lineItems as unknown[]) ?? [
      { id: "li1", description: "Professional fees", quantity: 1, rate: Number(row.amount ?? 0), amount: Number(row.amount ?? 0) },
      { id: "li2", description: "VAT", quantity: 1, rate: Number(row.vatAmount ?? 0), amount: Number(row.vatAmount ?? 0) },
    ],
  }
}

export const billingApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const status = String(f.invoiceStatus ?? "All")
      const billingType = String(f.billingType ?? "")
      const invoiceNo = String(f.invoiceNo ?? "").toLowerCase()
      const filtered = staticInvoices
        .map(i => enrichStaticInvoice(i as unknown as Record<string, unknown>))
        .filter(i => {
          if (status && status !== "All" && String(i.invoiceStatus) !== status) return false
          if (billingType && String(i.billingType) !== billingType) return false
          if (invoiceNo && !String(i.invoiceNo ?? "").toLowerCase().includes(invoiceNo)) return false
          if (f.clientId && String((i.client as { id?: string })?.id ?? "") !== String(f.clientId)) return false
          return true
        })
      return pageOf(filtered as Record<string, unknown>[], p)
    }
    const res = await axiosClient.post("/api/invoice/filter/all/v2", {}, {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        departmentName: f.departmentName ?? "",
        invoiceStatus: f.invoiceStatus ?? "All",
        billingType: f.billingType ?? "",
        invoiceNo: f.invoiceNo ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        year: f.year ?? "",
      },
    })
    const d = res.data?.data ?? res.data
    return {
      content: d.content ?? [],
      totalElements: d.totalElements ?? 0,
      totalPages: d.totalPages ?? 0,
      number: d.number ?? p.page,
      size: d.size ?? p.pageSize,
      first: d.first ?? true,
      last: d.last ?? true,
      empty: d.empty ?? true,
    }
  },

  async getById(invoiceId: string) {
    if (env.USE_STATIC_DATA) {
      const found = staticInvoices.find(i => i.id === invoiceId) ?? staticInvoices[0]
      return enrichStaticInvoice(found as unknown as Record<string, unknown>)
    }
    const res = await axiosClient.get("/api/invoice/get/by/id", { params: { invoiceId } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "inv-new" } }
    const res = await axiosClient.post("/api/invoice/add", data)
    return res.data?.data ?? res.data
  },

  async recordPayment(invoiceId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/invoice/pay", { invoiceId, ...data })
  },

  async cancel(invoiceId: string, reason?: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Invoice canceled." }
    const res = await axiosClient.post("/api/invoice/cancel", { invoiceId, reason })
    return res.data?.Msg ?? res.data?.message ?? "Invoice canceled."
  },

  async writeOff(invoiceId: string, reason?: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Invoice written off." }
    const res = await axiosClient.post("/api/invoice/write-off", { invoiceId, reason })
    return res.data?.Msg ?? res.data?.message ?? "Invoice written off."
  },

  async requestExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Invoice Excel export has been emailed."
    }
    const res = await axiosClient.get("/api/reports/export-excel/invoice/filter/all/excel", { params: filters })
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
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
