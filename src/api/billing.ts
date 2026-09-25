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

/** Map LMS `activities` (or activityItems) into display line items when `lineItems` is empty. */
function activitiesToLineItems(activities: unknown[]): Record<string, unknown>[] {
  return activities.map((raw, index) => {
    const a = raw as Record<string, unknown>
    const hours = Number(a.hours ?? 0)
    const minutes = Number(a.minutes ?? 0)
    const qtyFromDuration = hours > 0 || minutes > 0
      ? Number((hours + minutes / 60).toFixed(2))
      : undefined
    return {
      id: a.id ?? a.activityId ?? `act-${index}`,
      description: String(a.activity ?? a.description ?? a.note ?? a.name ?? "—"),
      quantity: a.quantity ?? qtyFromDuration ?? 1,
      rate: Number(a.rate ?? a.billing ?? 0),
      amount: Number(a.amount ?? a.billing ?? a.rate ?? 0),
    }
  })
}

function normalizeInvoiceDetail(row: Record<string, unknown>): Record<string, unknown> {
  const existing = Array.isArray(row.lineItems) ? (row.lineItems as unknown[]) : []
  const activities = Array.isArray(row.activities) ? (row.activities as unknown[]) : []
  const activityItems = Array.isArray(row.activityItems) ? (row.activityItems as unknown[]) : []
  const lineItems = existing.length > 0
    ? existing
    : activities.length > 0
      ? activitiesToLineItems(activities)
      : activityItems.length > 0
        ? activitiesToLineItems(activityItems)
        : []
  return {
    ...row,
    client: row.client ?? row.clientMini,
    billingType: row.billingType ?? row.invoiceBillingType,
    amount: row.amount ?? row.actualAmount,
    taxableAmount: row.taxableAmount ?? row.dueAmount,
    invoiceStatus: row.invoiceStatus ?? row.paymentStaus ?? row.status,
    lineItems,
  }
}

function enrichStaticInvoice(row: Record<string, unknown>): Record<string, unknown> {
  return normalizeInvoiceDetail({
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
  })
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
    const data = (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
    return normalizeInvoiceDetail(data)
  },

  /** LMS POST /invoice/add-to-zoho — create invoice (or credit note) in Zoho Books. */
  async addToZoho(invoiceId: string, opts?: { creditNote?: boolean }): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return opts?.creditNote
        ? "Credit Note created in Zoho successfully."
        : "Invoice created in Zoho successfully."
    }
    const path = opts?.creditNote ? "/api/invoice/creditNote/add-to-zoho" : "/api/invoice/add-to-zoho"
    const params = opts?.creditNote ? { creditNoteId: invoiceId } : { invoiceId }
    const res = await axiosClient.post(path, null, { params })
    const inner = res.data?.response as { code?: number; message?: string } | undefined
    if (inner && typeof inner.code === "number" && inner.code !== 0) {
      throw new Error(
        inner.message
          ?? (opts?.creditNote ? "Failed to create Credit Note in Zoho." : "Failed to create invoice in Zoho."),
      )
    }
    return String(
      inner?.message
        ?? res.data?.Msg
        ?? res.data?.message
        ?? (opts?.creditNote
          ? "Credit Note created in Zoho successfully."
          : "Invoice created in Zoho successfully."),
    )
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "inv-new" } }
    const res = await axiosClient.post("/api/invoice/add", data)
    return res.data?.data ?? res.data
  },

  async update(invoiceId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/invoice/edit/invoice", data, { params: { invoiceId } })
  },

  /** Unbilled / unpaid activities for a matter (LMS GenerateBill seed). */
  async getUnpaidByMatter(matterId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "a1", activity: "Legal research", entryDate: "2026-08-10", billing: 750, hours: 3, minutes: 0, rate: 250, billingType: "Hourly" },
        { id: "a2", activity: "Drafting", entryDate: "2026-08-12", billing: 500, hours: 2, minutes: 0, rate: 250, billingType: "Hourly" },
      ]
    }
    try {
      const res = await axiosClient.get("/api/activity/get/unpaid/matter/mini", {
        params: { matterId, pageNumber: 0, pageSize: 200 },
      })
      const d = res.data?.data ?? res.data ?? {}
      return (Array.isArray(d) ? d : d.content ?? []) as Record<string, unknown>[]
    } catch {
      const res = await axiosClient.post("/api/report/activity/filter/m/v3", {}, {
        params: { matterId, revenueStatus: "APPROVED", pageNumber: 0, pageSize: 200 },
      })
      const d = res.data?.data ?? res.data ?? {}
      return (Array.isArray(d) ? d : d.content ?? []) as Record<string, unknown>[]
    }
  },

  /** LMS GET /activity/unbilled/v2 — Hourly / Session (non-Fixed) Generate Bill grid. */
  async getUnbilledActivities(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    const billingType = String(f.billingType ?? "Hourly")
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const rows: Record<string, unknown>[] = [
        {
          id: "ua1", activity: "Legal research", note: "Legal research", entryDate: "2026-08-10",
          createdAt: "2026-08-10", billing: 750, hours: 3, minutes: 0, rate: 250, quantity: 3,
          billingType: "Hourly", billable: true, invoiceCreated: false, activityType: "Time",
          client: { id: "c1", companyName: "Al Rashid Holdings" },
          matterMini: { id: "m1", title: "260303 — Building Dispute" },
          title: "260303 — Building Dispute", agreementId: "LFA-001",
          responsiblePerson: { firstName: "Sarah", lastName: "Johnson" }, hourlyUnit: "Hour",
        },
        {
          id: "ua2", activity: "Drafting", note: "Drafting", entryDate: "2026-08-12",
          createdAt: "2026-08-12", billing: 500, hours: 2, minutes: 0, rate: 250, quantity: 2,
          billingType: "Hourly", billable: true, invoiceCreated: false, activityType: "Time",
          client: { id: "c1", companyName: "Al Rashid Holdings" },
          matterMini: { id: "m1", title: "260303 — Building Dispute" },
          title: "260303 — Building Dispute", agreementId: "LFA-001",
          responsiblePerson: { firstName: "Sarah", lastName: "Johnson" }, hourlyUnit: "Hour",
        },
        {
          id: "ua3", activity: "Hearing prep", note: "Hearing prep", entryDate: "2026-08-15",
          createdAt: "2026-08-15", billing: 800, hours: 1, minutes: 0, rate: 800, quantity: 1,
          billingType: "Session", billable: true, invoiceCreated: false, activityType: "Time",
          client: { id: "c1", companyName: "Al Rashid Holdings" },
          matterMini: { id: "m1", title: "260303 — Building Dispute" },
          title: "260303 — Building Dispute", agreementId: "LFA-001",
          responsiblePerson: { firstName: "Omar", lastName: "Hassan" }, hourlyUnit: "Session",
        },
      ].filter(r => {
        if (billingType && String(r.billingType) !== billingType) return false
        if (f.clientId && String((r.client as { id?: string })?.id) !== String(f.clientId)) return false
        if (f.matterId && String((r.matterMini as { id?: string })?.id) !== String(f.matterId)) return false
        return true
      })
      return pageOf(rows, p)
    }
    const res = await axiosClient.get("/api/activity/unbilled/v2", {
      params: {
        type: f.type ?? "Matter",
        billingType,
        billable: true,
        clientId: f.clientId ?? "",
        agreementId: f.agreementId ?? "",
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const raw = (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
    const billable = raw.filter(a => a.billable !== false)
    const filtered = billingType
      ? billable.filter(a => String(a.billingType ?? "") === billingType)
      : billable.filter(a => String(a.activityType ?? "") === "Time")
    return {
      content: filtered,
      totalElements: Number(d.totalElements ?? filtered.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(filtered.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: filtered.length === 0,
    }
  },

  /** LMS GET /matter/unbilled/v2 — Fixed Generate Bill grid. */
  async getUnbilledMatters(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf([
        {
          id: "m1", title: "260303 — Building Dispute", lfaNo: "LFA-001", lfaId: "lfa1",
          maxBillingAmount: 50000, billedAmount: 12000,
          client: { id: "c1", companyName: "Al Rashid Holdings" },
          currentBreakDown: { name: "Stage 1", rate: 10000 },
          stage: "Stage 1",
        },
      ] as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/matter/unbilled/v2", {
      params: {
        billingType: f.billingType ?? "Fixed",
        clientId: f.clientId ?? "",
        agreementId: f.agreementId ?? "",
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(content.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: content.length === 0,
    }
  },

  /** LMS GET /client/get/by/billing/type/v2 */
  async getClientsByBillingType(billingType: string): Promise<Record<string, unknown>[]> {
    if (env.USE_STATIC_DATA) {
      return [{ id: "c1", clientId: "c1", companyName: "Al Rashid Holdings", clientType: "COMPANY" }]
    }
    if (!billingType) return []
    const res = await axiosClient.get("/api/client/get/by/billing/type/v2", {
      params: { billingType },
    })
    const d = res.data?.data ?? res.data ?? []
    return (Array.isArray(d) ? d : []) as Record<string, unknown>[]
  },

  /**
   * LMS GET /reports/export-excel/unbilled-activities — emails Excel (not blob download).
   */
  async exportUnbilledActivities(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Unbilled activities Excel has been emailed."
    }
    const res = await axiosClient.get("/api/reports/export-excel/unbilled-activities", {
      params: {
        type: filters.type ?? "Matter",
        billingType: filters.billingType ?? "Hourly",
        billable: true,
        clientId: filters.clientId ?? "",
        agreementId: filters.agreementId ?? "",
        matterId: filters.matterId ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
      },
    })
    if (res.data?.code === "403" || res.data?.code === 403) {
      throw new Error(String(res.data?.Msg ?? res.data?.message ?? "Excel export not permitted."))
    }
    return String(res.data?.Msg ?? res.data?.message ?? "Excel export requested.")
  },

  async recordPayment(invoiceId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    // LMS: POST /invoice/pay?invoiceId=
    await axiosClient.post("/api/invoice/pay", data, { params: { invoiceId } })
  },

  async cancel(invoiceId: string, reason?: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Invoice canceled." }
    const res = await axiosClient.post("/api/invoice/cancel", { invoiceId, reason })
    return res.data?.Msg ?? res.data?.message ?? "Invoice canceled."
  },

  /** LMS POST /invoice/ap/send — { invoiceId, approval }. */
  async sendForApproval(invoiceId: string, approval: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Invoice sent for approval."
    }
    const res = await axiosClient.post("/api/invoice/ap/send", { invoiceId, approval })
    return res.data?.Msg ?? res.data?.message ?? "Invoice sent for approval."
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

  /** Prior retainer statements + LFA max hours (LMS CalculateHours). */
  async getRetainerStatementSummary(clientId: string, lfaId: string) {
    if (env.USE_STATIC_DATA) {
      return {
        maxRetainerHours: 40,
        generatedHours: 12,
        remainingHours: 28,
        statements: [{ id: "rs1", totalHours: 10, totalMinutes: 0 }],
        lfa: { retainerMaximumHr: 40, agreementNo: "LFA-001" },
      }
    }
    const res = await axiosClient.get("/api/activity/get/retainer/statement", {
      params: { clientId, lfaId },
    })
    const data = res.data?.data ?? res.data
    if (Array.isArray(data)) {
      const lfa = (data[0] as { lfa?: Record<string, unknown> } | undefined)?.lfa ?? {}
      const max = Number(lfa.retainerMaximumHr ?? 0)
      let generatedHours = 0
      let generatedMinutes = 0
      for (const item of data as { totalHours?: number; totalMinutes?: number }[]) {
        generatedHours += Number(item.totalHours ?? 0)
        generatedMinutes += Number(item.totalMinutes ?? 0)
      }
      const generated = Number((generatedHours + generatedMinutes / 60).toFixed(2))
      return {
        maxRetainerHours: max,
        generatedHours: generated,
        remainingHours: max ? Number((max - generated).toFixed(2)) : 0,
        statements: data,
        lfa,
      }
    }
    if (data && typeof data === "object") {
      const max = Number((data as { retainerMaximumHr?: number }).retainerMaximumHr ?? 0)
      return {
        maxRetainerHours: max,
        generatedHours: 0,
        remainingHours: max,
        statements: [],
        lfa: data as Record<string, unknown>,
      }
    }
    return { maxRetainerHours: 0, generatedHours: 0, remainingHours: 0, statements: [], lfa: {} }
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

  async sendEmail(invoiceId: string, emails?: string[]) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Email sent." }
    const res = await axiosClient.post(
      "/api/invoice/send/email",
      emails?.length ? { emails } : null,
      { params: { invoiceId } },
    )
    return res.data?.Msg ?? res.data?.message ?? "Email sent."
  },

  /** LMS PUT /invoice/cancel/{id}/{true|false} — true=Credit Note, false=Refund. */
  async cancelWithCredit(invoiceId: string, creditNote: boolean): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return creditNote ? "Canceled with credit note." : "Canceled with refund."
    }
    const res = await axiosClient.put(`/api/invoice/cancel/${invoiceId}/${creditNote}`)
    return res.data?.Msg ?? res.data?.message ?? "Invoice canceled."
  },

  async downloadPdf(
    invoiceId: string,
    opts?: { language?: string; targetCurrency?: string },
  ): Promise<Blob> {
    if (env.USE_STATIC_DATA) return new Blob(["%PDF mock"], { type: "application/pdf" })
    const res = await axiosBlob.get("/api/invoice/convert/pdf", {
      params: {
        invoiceId,
        ...(opts?.language ? { language: opts.language } : {}),
        ...(opts?.targetCurrency ? { targetCurrency: opts.targetCurrency } : {}),
      },
    })
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
      return normalizeFeeTypeRows(kind, STATIC_FEE_ROWS[kind])
    }
    const res = await axiosClient.get(cfg.path, {
      params: {
        billingStatus: filters.billingStatus ?? "unbilled",
        clientId: filters.clientId ?? "",
        agreementId: filters.agreementId ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
      },
    })
    const d = res.data?.data ?? res.data
    const rows = Array.isArray(d) ? d : (d?.content ?? [])
    return normalizeFeeTypeRows(kind, rows as Record<string, unknown>[])
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

  async getReceipts(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      const rows = [
        {
          id: "rc1",
          invoiceNo: "INV-1001",
          invoicePrefix: "TAX",
          dueAmount: 10000,
          amount: 5000,
          createdAt: "2026-08-01",
          attachment: "receipt-1001.pdf",
          type: "Paid",
        },
        {
          id: "rc2",
          invoiceNo: "INV-1002",
          invoicePrefix: "TAX",
          dueAmount: 3000,
          amount: 3000,
          createdAt: "2026-08-15",
          attachment: "",
          type: "Paid",
        },
      ]
      return {
        content: rows,
        totalElements: rows.length,
        totalPages: 1,
        number: 0,
        size: p.pageSize,
        first: true,
        last: true,
        empty: false,
      }
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/collections", {
      params: {
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    // LMS typo: reciepts
    const raw = (d.reciepts ?? d.receipts ?? d.content ?? (Array.isArray(d) ? d : [])) as Record<string, unknown>[]
    const content = raw
      .filter(r => String(r.type ?? "") !== "Canceled")
      .map(r => {
        const inv = (r.invoice as Record<string, unknown> | undefined) ?? {}
        return {
          ...r,
          id: String(r.id ?? r.receiptId ?? ""),
          invoiceNo: (() => {
            const composed = `${String(inv.invoicePrefix ?? r.invoicePrefix ?? "")}${String(inv.invoiceNo ?? "")}`
            return String(r.invoiceNo ?? (composed || "—"))
          })(),
          dueAmount: Number(r.dueAmount ?? inv.dueAmount ?? 0),
          amount: Number(r.amount ?? r.paidAmount ?? 0),
          createdAt: String(r.createdAt ?? r.payDate ?? r.receiptDate ?? ""),
          attachment: String(r.attachment ?? r.fileName ?? r.file ?? ""),
          attachmentUrl: String(r.attachmentUrl ?? r.fileUrl ?? r.url ?? ""),
        }
      })
    return {
      content,
      totalElements: content.length,
      totalPages: 1,
      number: 0,
      size: content.length || p.pageSize,
      first: true,
      last: true,
      empty: content.length === 0,
    }
  },

  async cancelReceipt(receiptId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Receipt canceled."
    }
    const res = await axiosClient.post("/api/invoice/cancel/receipt", null, {
      params: { receiptId },
    })
    return res.data?.Msg ?? res.data?.message ?? "Receipt canceled."
  },

  async getWriteCreditHistory(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return {
        content: [
          { id: "wch1", invoiceId: "inv1", taxInvoiceNo: "INV-1001", clientName: "Al Rashid Holdings", matterTitle: "260303", type: "WriteOff", amount: 1500, reason: "Goodwill", createdBy: "Admin", createdAt: "2026-08-20" },
          { id: "wch2", invoiceId: "inv2", taxInvoiceNo: "INV-1002", clientName: "KM Group", matterTitle: "260293", type: "CreditNote", amount: 500, reason: "Billing error", createdBy: "Sarah Johnson", createdAt: "2026-09-01" },
        ],
        totalElements: 2, totalPages: 1, number: 0, size: p.pageSize, first: true, last: true, empty: false,
      }
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/invoice/write/credit/history", {
      params: {
        clientId: f.clientId ?? "",
        type: f.type ?? "WriteOff",
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (Array.isArray(d) ? d : d.content ?? []) as Record<string, unknown>[]
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? 1),
      number: p.page,
      size: p.pageSize,
      first: p.page === 0,
      last: true,
      empty: content.length === 0,
    }
  },
}

export type FeeBillKind = "Contingent" | "NonContingent" | "SuccessRate" | "Enforcement"

const FEE_BILL_ENDPOINTS: Record<FeeBillKind, { path: string }> = {
  Contingent:    { path: "/api/lfa/contingents" },
  NonContingent: { path: "/api/lfa/non/contingents" },
  SuccessRate:   { path: "/api/lfa/success/rate" },
  Enforcement:   { path: "/api/lfa/enforcement/billing" },
}

/** LMS success-rate / contingent remaining-amount parity. */
export function computeSuccessFinalFees(row: Record<string, unknown>): number {
  const billingType = String(row.billingType ?? "")
  const successRate = Number(row.successRate ?? 0)
  const successRateType = String(row.successRateType ?? "")
  const fixedFee = Number(row.fixedFee ?? row.fixedBillingAmount ?? 0)
  if (billingType !== "Fixed") return successRate
  if (successRateType === "Flat" || successRateType === "Amount") return successRate
  return fixedFee * (successRate / 100)
}

function normalizeFeeTypeRows(kind: FeeBillKind, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((raw, i) => {
    if (kind === "Enforcement") {
      const lfa = (raw.lfa ?? raw) as Record<string, unknown>
      const clients = (lfa.clients ?? lfa.client ?? raw.clients ?? raw.client) as Record<string, unknown> | undefined
      return {
        ...raw,
        ...lfa,
        id: String(lfa.id ?? raw.id ?? `en-${i}`),
        agreementNo: lfa.agreementNo ?? raw.agreementNo,
        clients,
        client: clients,
        enforcementAmount: Number(raw.enforcementAmount ?? lfa.enforcementAmount ?? 0),
        enforcementBillingId: String(raw.id ?? raw.enforcementBillingId ?? ""),
        remainingAmount: Number(raw.enforcementAmount ?? lfa.enforcementAmount ?? 0),
        matterId: raw.matterId ?? lfa.matterId,
      }
    }

    if (kind === "SuccessRate") {
      const finalFixedFees = Number(raw.finalFixedFees ?? computeSuccessFinalFees(raw))
      const billed = Number(raw.successRateBilledAmount ?? 0)
      const remainingAmount = finalFixedFees - billed
      return {
        ...raw,
        finalFixedFees,
        successRateBilledAmount: billed,
        remainingAmount,
      }
    }

    if (kind === "Contingent") {
      const total = Number(raw.contingent ?? 0)
      const billed = Number(raw.billedAmount ?? raw.contingentBilledAmount ?? 0)
      return {
        ...raw,
        remainingAmount: total - billed,
        billedAmount: billed,
      }
    }

    if (kind === "NonContingent") {
      const total = Number(raw.nonContingent ?? 0)
      const billed = Number(raw.billedAmount ?? raw.nonContingentBilledAmount ?? 0)
      return {
        ...raw,
        remainingAmount: total - billed,
        billedAmount: billed,
      }
    }

    return raw
  })
}

const STATIC_FEE_ROWS: Record<FeeBillKind, Record<string, unknown>[]> = {
  Contingent: [
    { id: "ct1", agreementNo: "LFA-001", contingent: 25000, billedAmount: 5000, billingType: "Fixed", clients: { id: "c1", companyName: "Al Rashid Holdings" }, agreementDate: "2026-01-01", scope: "Litigation" },
  ],
  NonContingent: [
    { id: "nc1", agreementNo: "LFA-002", nonContingent: 12000, billedAmount: 0, clients: { id: "c2", firstName: "Emily", lastName: "Harper" }, agreementDate: "2026-02-01", scope: "Advisory" },
  ],
  SuccessRate: [
    {
      id: "sr1",
      agreementNo: "LFA-003",
      billingType: "Fixed",
      successRateType: "Percentage",
      successRate: 10,
      fixedFee: 400000,
      successRateBilledAmount: 10000,
      clients: { id: "c1", companyName: "Al Rashid Holdings" },
      agreementDate: "2026-03-01",
      scope: "Dispute",
    },
  ],
  Enforcement: [
    {
      id: "enb1",
      enforcementAmount: 8000,
      matterId: "m1",
      lfa: {
        id: "en1",
        agreementNo: "LFA-004",
        clients: { id: "c1", companyName: "Al Rashid Holdings" },
        agreementDate: "2026-04-01",
        scope: "Enforcement",
      },
    },
  ],
}
