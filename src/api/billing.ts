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
    const d = res.data?.data ?? res.data ?? {}
    const content = (Array.isArray(d.content) ? d.content
      : Array.isArray(d) ? d
      : []) as Record<string, unknown>[]
    // Normalize LMS field aliases so list columns render (clientMini, paymentStaus, dueAmount, …).
    const mapped = content.map(row => ({
      ...row,
      client: row.client ?? row.clientMini,
      billingType: row.billingType ?? row.invoiceBillingType,
      amount: row.amount ?? row.actualAmount,
      taxableAmount: row.taxableAmount ?? row.dueAmount,
      invoiceStatus: row.invoiceStatus ?? row.paymentStaus,
      createdBy: row.createdBy ?? row.createdByName,
      invoiceNo: row.invoiceNo ?? row.taxInvoiceNo,
    }))
    return {
      content: mapped,
      totalElements: Number(d.totalElements ?? mapped.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(mapped.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: mapped.length === 0,
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

  /** Amount/VAT write-off or invoice credit-note (LMS wizard). */
  async writeOffDetailed(
    invoiceId: string,
    type: "writeOff" | "creditNote",
    payload: Record<string, unknown>,
  ): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return type === "creditNote" ? "Credit note applied." : "Invoice written off."
    }
    const path = type === "writeOff" ? "/api/invoice/write/off" : "/api/invoice/creditNote"
    const res = await axiosClient.post(path, payload, { params: { invoiceId } })
    return res.data?.Msg ?? res.data?.message ?? (type === "creditNote" ? "Credit note applied." : "Invoice written off.")
  },

  async filterInvoicesForWriteOff(params: {
    clientId?: string
    matterId?: string
    type: "writeOff" | "creditNote"
  }) {
    if (env.USE_STATIC_DATA) {
      return staticInvoices
        .map(i => enrichStaticInvoice(i as unknown as Record<string, unknown>))
        .filter(i => {
          const status = String(i.invoiceStatus ?? "")
          if (params.type === "writeOff") return status === "Draft"
          return status === "Due" || status === "Partially_Paid" || status === "Overdue"
        })
    }
    const res = await axiosClient.post("/api/invoice/filter", {}, {
      params: {
        clientId: params.clientId ?? "",
        matterId: params.matterId ?? "",
        invoiceStatus: params.type === "writeOff" ? "Draft" : "Due",
        pageNumber: 0,
        pageSize: 100,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    return (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
  },

  async getActivitiesByInvoice(invoiceId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { activityId: "a1", id: "a1", activity: "Research", amount: 500, activityDuration: "01:00" },
        { activityId: "a2", id: "a2", activity: "Drafting", amount: 800, activityDuration: "02:00" },
      ]
    }
    const res = await axiosClient.get("/api/activity/by/invoice", { params: { invoiceId } })
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : (d?.content ?? [])
  },

  async getCreditNotes(clientId: string) {
    if (env.USE_STATIC_DATA) {
      return {
        creditNote: { amount: 2500 },
        creditNoteWithTransactionList: [
          { id: "cn1", amount: 1500, createdAt: "2026-08-01T10:00:00", clientMini: { firstName: "Al", lastName: "Rashid", middleName: "" } },
          { id: "cn2", amount: 1000, createdAt: "2026-08-15T12:00:00", clientMini: { firstName: "Al", lastName: "Rashid", middleName: "" } },
        ],
      }
    }
    const res = await axiosClient.get("/api/credit/note/get", { params: { clientId } })
    return res.data?.data ?? res.data ?? { creditNote: null, creditNoteWithTransactionList: [] }
  },

  async addCreditNote(data: {
    clientId: string
    paymentMode: string
    paymentDate?: string | null
    amount: number
    note: string
  }): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Credit note added."
    }
    const res = await axiosClient.post("/api/credit/note/add", data)
    return res.data?.Msg ?? res.data?.message ?? "Credit note added."
  },

  async getRetainerActivities(filters: Record<string, unknown> = {}) {
    if (env.USE_STATIC_DATA) {
      return [
        {
          id: "ra1", activityId: "ra1", activityType: "Time", activity: "Retainer work",
          totalHours: 2.5, hours: 2, minutes: 30, invoiceCreated: false,
          client: { companyName: "Al Rashid Holdings" },
          matter: { title: "260303 — Building Dispute" },
          lfa: { agreementNo: "LFA-001" },
          responsiblePersonName: "Sarah Johnson",
          createdAt: "2026-08-01",
        },
      ]
    }
    const res = await axiosClient.get("/api/activity/retainer", {
      params: {
        billingStatus: filters.billingStatus ?? "unbilled",
        clientId: filters.clientId ?? "",
        agreementId: filters.agreementId ?? "",
        matterId: filters.matterId ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
      },
    })
    const d = res.data?.data ?? res.data
    const list = Array.isArray(d) ? d : (d?.content ?? [])
    return (list as Record<string, unknown>[]).filter(a => a.activityType === "Time" || !a.activityType)
  },

  async generateRetainerStatement(data: Record<string, unknown>): Promise<string | null> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 400))
      return null
    }
    const res = await axiosClient.post("/api/activity/retainer/statement", data)
    return res.data?.data ?? null
  },

  async getRetainerStatements(filters: Record<string, unknown> = {}, page = 0, pageSize = 20) {
    if (env.USE_STATIC_DATA) {
      return {
        content: [
          {
            id: "rs1", statementReference: "RS-2026-001", clientName: "Al Rashid Holdings",
            lfaNo: "LFA-001", matterNo: "260303", createdAt: "2026-08-01",
            month: "August", totalHours: 40, billedHours: 12, remainingHours: 28,
          },
        ],
        totalElements: 1,
      }
    }
    const res = await axiosClient.get("/api/activity/retainer/statement/filter", {
      params: {
        clientId: filters.clientId ?? "",
        lfaNo: filters.lfaNo ?? filters.agreementId ?? "",
        matterId: filters.matterId ?? "",
        createdFromDate: filters.fromDate ?? "",
        createdToDate: filters.toDate ?? "",
        pageNumber: page,
        pageSize,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const list = d.retainerStatementList ?? d.content ?? (Array.isArray(d) ? d : [])
    return { content: list as Record<string, unknown>[], totalElements: Number(d.totalElements ?? list.length) }
  },

  async downloadRetainerPdf(statementId: string): Promise<Blob> {
    if (env.USE_STATIC_DATA) return new Blob(["%PDF mock"], { type: "application/pdf" })
    const res = await axiosBlob.get("/api/retainer-statement/pdf", { params: { statementId } })
    return res.data as Blob
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

  /** Unbilled pass-to-client expense activities for expense billing. */
  async getExpenseActivities(filters: Record<string, unknown> = {}) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return {
        content: [
          { id: "ea1", activityId: "ea1", note: "Court filing fees", rate: 450, hours: 0, minutes: 0, billable: true, invoiceCreated: false, disbursementType: "OTHER_EXPENSES", entryDate: "2026-08-01" },
          { id: "ea2", activityId: "ea2", note: "Courier charges", rate: 120, hours: 0, minutes: 0, billable: true, invoiceCreated: false, disbursementType: "COURIER", entryDate: "2026-08-03" },
        ],
        totalElements: 2,
      }
    }
    const res = await axiosClient.post("/api/report/activity/filter/m", {}, {
      params: {
        clientId: filters.clientId ?? "",
        matterId: filters.matterId ?? "",
        userId: filters.userId ?? "",
        sessionType: false,
        lfaId: filters.lfaId ?? "",
        departmentId: filters.departmentId ?? "",
        billable: true,
        expense: true,
        activityType: filters.activityType ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
        pageNumber: filters.pageNumber ?? 0,
        pageSize: filters.pageSize ?? 100,
        disbursementPaymentType: "PASS_TO_CLIENT",
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    return { content: d.content ?? (Array.isArray(d) ? d : []), totalElements: Number(d.totalElements ?? 0) }
  },

  async calculateHoursMini(activitiesList: Record<string, unknown>[]) {
    if (env.USE_STATIC_DATA) {
      return { hourlyRates: [], total: activitiesList.reduce((s, a) => s + Number(a.rate ?? 0), 0) }
    }
    const res = await axiosClient.post("/api/activity/calculate/hours/mini", { activitiesList })
    return res.data?.data ?? res.data
  },

  async getFeeTypeRows(kind: FeeBillKind, filters: Record<string, unknown> = {}) {
    const cfg = FEE_BILL_ENDPOINTS[kind]
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return STATIC_FEE_ROWS[kind]
    }
    const res = await axiosClient.get(cfg.path, {
      params: {
        billingStatus: filters.billingStatus ?? "unbilled",
        clientId: filters.clientId ?? "",
        agreementId: filters.agreementId ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
        ...(kind === "Enforcement" ? {} : {}),
      },
    })
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : (d?.content ?? [])
  },

  async getMattersByClientLfa(clientId: string, lfaId: string) {
    if (env.USE_STATIC_DATA) {
      return [{ id: "m1", title: "260303 — Building Dispute" }]
    }
    const res = await axiosClient.get("/api/matter/by-client-lfa", { params: { clientId, lfaId } })
    const d = res.data?.data ?? res.data
    return d?.content ?? (Array.isArray(d) ? d : [])
  },

  async completeEnforcementBilling(enforcementBillingId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 200)); return }
    await axiosClient.get("/api/invoice/enforcement/billing/complete", { params: { enforcementBillingId } })
  },

  async getReceipts(filters: Record<string, unknown> = {}) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "rc1", receiptNo: "RCPT-001", clientName: "Al Rashid Holdings", amount: 5000, receiptDate: "2026-08-01", status: "Active" },
      ]
    }
    const res = await axiosClient.get("/api/report/collections", {
      params: { clientId: filters.clientId ?? "", matterId: filters.matterId ?? "" },
    })
    const d = res.data?.data ?? res.data
    return Array.isArray(d) ? d : (d?.content ?? [])
  },
}

export type FeeBillKind = "Contingent" | "NonContingent" | "SuccessRate" | "Enforcement"

const FEE_BILL_ENDPOINTS: Record<FeeBillKind, { path: string }> = {
  Contingent:    { path: "/api/lfa/contingents" },
  NonContingent: { path: "/api/lfa/non/contingents" },
  SuccessRate:   { path: "/api/lfa/success/rate" },
  Enforcement:   { path: "/api/lfa/enforcement/billing" },
}

const STATIC_FEE_ROWS: Record<FeeBillKind, Record<string, unknown>[]> = {
  Contingent: [
    { id: "ct1", agreementNo: "LFA-001", contingent: 25000, billedAmount: 5000, clients: { id: "c1", companyName: "Al Rashid Holdings" } },
  ],
  NonContingent: [
    { id: "nc1", agreementNo: "LFA-002", nonContingent: 12000, clients: { id: "c2", firstName: "Emily", lastName: "Harper" } },
  ],
  SuccessRate: [
    { id: "sr1", agreementNo: "LFA-003", finalFixedFees: 40000, successRateBilledAmount: 10000, clients: { id: "c1", companyName: "Al Rashid Holdings" } },
  ],
  Enforcement: [
    { id: "en1", agreementNo: "LFA-004", enforcementAmount: 8000, enforcementBillingId: "enb1", matterId: "m1", clients: { id: "c1", companyName: "Al Rashid Holdings" } },
  ],
}
