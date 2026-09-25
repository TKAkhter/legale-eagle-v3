import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import {
  dashboard as staticDash,
  matters as staticMatters,
  billedAmountReport,
  collectionsReport,
  marginErosionReport,
  activityFeed as staticActivityFeed,
} from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

const STATIC_WIP = [
  { id: "w1", userName: "Sarah Johnson", matterTitle: "260303 — Building Dispute", activity: "Document Review", totalHours: 3.5, totalAmount: 3500, billingType: "Hourly", entryDate: "2026-07-01", revenueStatus: "DRAFT" },
  { id: "w2", userName: "Sarah Johnson", matterTitle: "260293 — Rental Dispute", activity: "Client Meeting", totalHours: 2.0, totalAmount: 2000, billingType: "Hourly", entryDate: "2026-07-02", revenueStatus: "DRAFT" },
  { id: "w3", userName: "Dory Abi Khalil", matterTitle: "260285 — Corporate Setup", activity: "Contract Drafting", totalHours: 4.0, totalAmount: 4800, billingType: "Hourly", entryDate: "2026-07-03", revenueStatus: "PRE_APPROVAL" },
  { id: "w4", userName: "Mashood Rafi", matterTitle: "260303 — Building Dispute", activity: "Court Attendance", totalHours: 6.0, totalAmount: 7200, billingType: "Hourly", entryDate: "2026-07-04", revenueStatus: "DRAFT" },
  { id: "w5", userName: "Ahmad AlKhalil", matterTitle: "260285 — Corporate Setup", activity: "Due Diligence", totalHours: 5.0, totalAmount: 6000, billingType: "Hourly", entryDate: "2026-07-05", revenueStatus: "APPROVED" },
]

const STATIC_MB = (staticMatters as unknown as { id: string; title: string; clientMini: { companyName: string; firstName: string }; billingType: string; status: string }[]).map((m, i) => ({
  id: m.id,
  matterTitle: m.title,
  clientName: m.clientMini?.companyName || m.clientMini?.firstName || "—",
  billingType: m.billingType,
  agreementNo: `LFA-00${i + 1}`,
  totalBilled: [15000, 8500, 5000][i] ?? 0,
  totalBilledAmount: [15000, 8500, 5000][i] ?? 0,
  collected: [15000, 4000, 0][i] ?? 0,
  creditNoteAmount: 0,
  totalNetAmount: [15000, 8500, 5000][i] ?? 0,
  wip: [0, 4500, 5000][i] ?? 0,
  status: m.status,
  matterStatus: m.status,
}))

const STATIC_UTIL = [
  {
    id: "u1", feeEarner: "Sarah Johnson", department: { name: "Litigation" },
    totalHours: 160, targetHours: 168, billableHours: 120, nonBillableHours: 20,
    totalBillableAndNonBillable: 140, adminHours: 8, bdHours: 6, preEngageHours: 4,
    sickLeaveHours: 0, annualLeaveHours: 2,
  },
  {
    id: "u2", feeEarner: "Dory Abi Khalil", department: { name: "Corporate" },
    totalHours: 150, targetHours: 168, billableHours: 110, nonBillableHours: 15,
    totalBillableAndNonBillable: 125, adminHours: 10, bdHours: 8, preEngageHours: 5,
    sickLeaveHours: 2, annualLeaveHours: 0,
  },
  {
    id: "u3", feeEarner: "Mashood Rafi", department: { name: "Family Law" },
    totalHours: 140, targetHours: 168, billableHours: 100, nonBillableHours: 18,
    totalBillableAndNonBillable: 118, adminHours: 6, bdHours: 10, preEngageHours: 4,
    sickLeaveHours: 0, annualLeaveHours: 2,
  },
]

const STATIC_BILLED_FE = [
  {
    id: "ba1", responsiblePerson: "Sarah Johnson", department: { name: "Litigation" },
    billedAmount: 85000, writeOffAmount: 2000, creditNoteAmount: 1500, netamount: 81500,
  },
  {
    id: "ba2", responsiblePerson: "Dory Abi Khalil", department: { name: "Corporate" },
    billedAmount: 62000, writeOffAmount: 0, creditNoteAmount: 500, netamount: 61500,
  },
  {
    id: "ba3", responsiblePerson: "Mashood Rafi", department: { name: "Family Law" },
    billedAmount: 28000, writeOffAmount: 1000, creditNoteAmount: 0, netamount: 27000,
  },
]

/** LMS util-report flatten — percentages + admin totals (hours already decimal). */
function flattenUtilizationRow(row: Record<string, unknown>, index: number): Record<string, unknown> {
  const num = (v: unknown) => {
    const n = parseFloat(String(v ?? 0))
    return Number.isFinite(n) ? n : 0
  }
  const round2 = (n: number) => Math.round(n * 100) / 100
  const pct = (numr: number, den: number) => (den > 0 ? round2((numr / den) * 100) : 0)

  const targetHours = num(row.targetHours)
  const billableHours = num(row.billableHours)
  const nonBillableHours = num(row.nonBillableHours)
  const totalBillableAndNonBillable = num(row.totalBillableAndNonBillable) || round2(billableHours + nonBillableHours)
  const adminHours = num(row.adminHours)
  const bdHours = num(row.bdHours)
  const preEngageHours = num(row.preEngageHours)
  const sickLeaveHours = num(row.sickLeaveHours)
  const annualLeaveHours = num(row.annualLeaveHours)
  const totalAdminHoursFixed = round2(adminHours + bdHours + preEngageHours + sickLeaveHours + annualLeaveHours)
  const totalHours = num(row.totalHours) || round2(totalBillableAndNonBillable + totalAdminHoursFixed)
  const dept = row.department as { name?: string } | string | null | undefined
  const departmentName = typeof dept === "string" ? dept : (dept?.name ?? String(row.departmentName ?? ""))

  return {
    ...row,
    id: String(row.id ?? row.userId ?? `util-${index}`),
    feeEarner: String(row.feeEarner ?? row.userName ?? row.name ?? "—"),
    departmentName,
    totalHours: round2(totalHours),
    targetHours: round2(targetHours),
    billableHours: round2(billableHours),
    nonBillableHours: round2(nonBillableHours),
    totalBillableAndNonBillable: round2(totalBillableAndNonBillable),
    adminHours: round2(adminHours),
    bdHours: round2(bdHours),
    preEngageHours: round2(preEngageHours),
    sickLeaveHours: round2(sickLeaveHours),
    annualLeaveHours: round2(annualLeaveHours),
    totalAdminHoursFixed,
    percentOnRecordedHours: pct(totalBillableAndNonBillable, totalHours),
    percentOnTargetHours: pct(totalBillableAndNonBillable, targetHours),
    adminHoursOnTargetHours: pct(adminHours, targetHours),
    BDHoursOnTargetHours: pct(bdHours, targetHours),
    preEngageHoursOnTargetHours: pct(preEngageHours, targetHours),
    totalAdminHoursOnTargetHours: pct(totalAdminHoursFixed, targetHours),
  }
}

function flattenBilledAmountRow(row: Record<string, unknown>, index: number): Record<string, unknown> {
  const billed = Number(row.billedAmount ?? row.totalBilled ?? 0) || 0
  const writeOff = Number(row.writeOffAmount ?? 0) || 0
  const credit = Number(row.creditNoteAmount ?? row.creditnote ?? 0) || 0
  const net = Number(row.netamount ?? row.netAmount ?? billed - writeOff - credit)
  const dept = row.department as { name?: string } | string | null | undefined
  const departmentName = typeof dept === "string"
    ? dept
    : (dept?.name ?? String(row.departmentName ?? row.departmentname ?? ""))
  return {
    ...row,
    id: String(row.id ?? row.userId ?? `ba-${index}`),
    responsiblePerson: String(row.responsiblePerson ?? row.userName ?? row.feeEarner ?? "—"),
    departmentName,
    billedAmount: billed,
    writeOffAmount: writeOff,
    creditNoteAmount: credit,
    netAmount: Number.isFinite(net) ? net : billed - writeOff - credit,
  }
}

function pg<T>(data: T[], p: GridParams): PageResponse<T> {
  const start = p.page * p.pageSize
  const slice = data.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: data.length,
    totalPages: Math.ceil(data.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= data.length,
    empty: slice.length === 0,
  }
}

function unwrap(data: unknown, p: GridParams): PageResponse<Record<string, unknown>> {
  const d = (data ?? {}) as Record<string, unknown>
  const content = (Array.isArray(d.content) ? d.content
    : Array.isArray(d) ? d
    : Array.isArray(d.data) ? d.data
    : Array.isArray(d.hearingsMinis) ? d.hearingsMinis
    : []) as Record<string, unknown>[]
  if (Array.isArray(d.content) || typeof d.totalElements === "number" || typeof d.totalHearings === "number") {
    return {
      content,
      totalElements: Number(d.totalElements ?? d.totalHearings ?? content.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(content.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: Boolean(d.empty ?? content.length === 0),
    }
  }
  return pg(content, p)
}

function toIdArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(typeof x === "object" && x && "id" in x ? (x as { id: unknown }).id : x)).filter(Boolean)
  if (typeof v === "string" && v.trim()) return [v.trim()]
  if (v && typeof v === "object" && "id" in (v as object)) return [String((v as { id: unknown }).id)].filter(Boolean)
  return []
}

async function excelMsg(path: string, params: Record<string, unknown> = {}, method: "get" | "post" = "get"): Promise<string> {
  if (env.USE_STATIC_DATA) {
    await new Promise(r => setTimeout(r, 250))
    return "Excel will be emailed shortly."
  }
  const res = method === "post"
    ? await axiosClient.post(path, {}, { params })
    : await axiosClient.get(path, { params })
  const dataMsg = typeof res.data?.data === "string" ? res.data.data : undefined
  return res.data?.Msg ?? res.data?.message ?? dataMsg ?? "Excel export requested."
}

const ACTIVITY_RELATED_TO_MAP: Record<string, string> = {
  Admin: "ADMIN",
  "Business Development": "BUSINESS_DEVELOPMENT",
  Client: "CLIENT",
  Lead: "LEAD",
  Leave: "LEAVE",
  Matter: "MATTER",
  "Training And Development": "TRAINING_AND_DEVELOPMENT",
  ADMIN: "ADMIN",
  BUSINESS_DEVELOPMENT: "BUSINESS_DEVELOPMENT",
  CLIENT: "CLIENT",
  LEAD: "LEAD",
  LEAVE: "LEAVE",
  MATTER: "MATTER",
  TRAINING_AND_DEVELOPMENT: "TRAINING_AND_DEVELOPMENT",
}

/**
 * Parse LMS POST /zoho/outstanding `Msg` JSON.
 * Shape: `{ customer|invoice: { [id]: [item] | string } }`.
 */
function parseZohoOutstandingMap(
  rawMsg: unknown,
  section: "customer" | "invoice",
): { rows: Record<string, unknown>[]; errorMessage?: string } {
  let map: Record<string, unknown> = {}
  try {
    const parsed = typeof rawMsg === "string" ? JSON.parse(rawMsg) : rawMsg
    const root = (parsed ?? {}) as Record<string, unknown>
    const sectionVal = root[section] ?? (section === "customer" ? root.customer : root.invoice) ?? root
    map = (sectionVal && typeof sectionVal === "object" && !Array.isArray(sectionVal))
      ? sectionVal as Record<string, unknown>
      : {}
  } catch {
    return { rows: [], errorMessage: "Failed to parse Zoho outstanding response." }
  }

  const entries = Object.entries(map)
  const messageEntry = entries.find(([, value]) => typeof value === "string")
  if (messageEntry) {
    return { rows: [], errorMessage: String(messageEntry[1]) }
  }

  const rows: Record<string, unknown>[] = []
  for (const [key, value] of entries) {
    const item = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | undefined
    if (!item || typeof item !== "object") continue
    if (section === "customer") {
      rows.push({
        id: key,
        contactName: String(item.contact_name ?? item.customer_name ?? "—"),
        customerName: String(item.customer_name ?? "—"),
        companyName: String(item.company_name ?? "—"),
        outstandingReceivable: Number(item.outstanding_receivable_amount ?? 0),
        outstandingPayable: Number(item.outstanding_payable_amount ?? 0),
        status: String(item.status ?? "—"),
        legalEagleId: String(item.cf_legal_eagle_customers_id ?? "—"),
        contactId: String(item.contact_id ?? item.customer_id ?? key),
        createdAt: String(item.created_time_formatted ?? "—"),
      })
    } else {
      rows.push({
        id: key,
        customerName: String(item.customer_name ?? "—"),
        invoiceNumber: String(item.invoice_number ?? "—"),
        amount: Number(item.total ?? 0),
        balance: item.balance != null ? Number(item.balance) : null,
        currencyCode: String(item.currency_code ?? "—"),
        referenceNumber: String(item.reference_number ?? "—"),
        createdBy: String(item.created_by ?? "—"),
        status: String(item.status ?? "—"),
        dueDate: String(item.due_date ?? "—"),
      })
    }
  }
  return { rows }
}

/** Shared filter params for activities report list + email excel (LMS ListV2). */
function activitiesReportFilterParams(f: Record<string, unknown>): Record<string, unknown> {
  const rawRelated = String(f.activityRelatedTo ?? f.category ?? "")
  const activityRelatedTo = !rawRelated || rawRelated === "All"
    ? ""
    : (ACTIVITY_RELATED_TO_MAP[rawRelated] ?? rawRelated)
  const activityBillingType = f.activityBillingType === "All" ? "" : (f.activityBillingType ?? "")
  const matterBillingType = f.matterBillingType === "All" ? "" : (f.matterBillingType ?? "")
  return {
    activityType: f.activityType ?? "",
    activityRelatedTo,
    clientId: f.clientId ?? "",
    matterId: f.matterId ?? "",
    userId: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
    billable: f.billable ?? "",
    lfaId: f.lfaId ?? "",
    activityBillingType,
    matterBillingType,
    departmentId: f.departmentId ?? "",
    sessionType: false,
    billingStatus: f.billingStatus ?? "",
  }
}

export const reportsApi = {
  async getWip(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const filtered = q
        ? STATIC_WIP.filter(r => `${r.userName} ${r.matterTitle}`.toLowerCase().includes(q))
        : STATIC_WIP
      return pg(filtered as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/wip-reports/fee-earners", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy,
        sortDir: p.sortDir,
        responsiblePerson: f.userId ?? f.responsiblePerson ?? "",
        departmentId: f.departmentId ?? "",
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        invoiceCreated: false,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestWipExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/wip-reports/fee-earners/excel", {
      responsiblePerson: filters.userId ?? filters.responsiblePerson ?? "",
      departmentId: filters.departmentId ?? "",
      matterId: filters.matterId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
    })
  },

  /** Fee-earner billed amount (nav: Billed Amount) — LMS `/billed-amount`. */
  async getBilledAmount(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(
        (STATIC_BILLED_FE as Record<string, unknown>[]).map((r, i) => flattenBilledAmountRow(r, i)),
        p,
      )
    }
    const f = p.filters ?? {}
    const responsiblePersonId = String(
      f.responsiblePersonId ?? f.userId ?? f.responsiblePerson ?? "",
    )
    const res = await axiosClient.get("/api/report/fee-earners/billed-amount", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        departmentId: f.departmentId ?? "",
        responsiblePersonId,
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    const page = unwrap(res.data?.data ?? res.data, p)
    const filtered = page.content.filter(r => String(r.billedAmount) !== "NaN")
    return { ...page, content: filtered.map((r, i) => flattenBilledAmountRow(r, i)) }
  },

  async requestBilledAmountExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/fee-earners-billed-amount-excel", {
      departmentId: filters.departmentId ?? "",
      responsiblePersonId: filters.responsiblePersonId ?? filters.userId ?? filters.responsiblePerson ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
    })
  },

  /** Department billing (related report) */
  async getDepartmentBilling(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(billedAmountReport as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/department/billing/v2", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getMatterBilling(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(STATIC_MB as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/matter/billing/v2", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        lfaId: f.lfaId ?? "",
        invoiceFromDate: f.fromDate ?? f.invoiceFromDate ?? "",
        invoiceToDate: f.toDate ?? f.invoiceToDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestMatterBillingExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/download-excel/get/matter-billing", {
      clientId: filters.clientId ?? "",
      matterId: filters.matterId ?? "",
      lfaId: filters.lfaId ?? "",
      invoiceFromDate: filters.fromDate ?? "",
      invoiceToDate: filters.toDate ?? "",
    }, "post")
  },

  /** Invoice-level drill-down for a matter billing row (LMS `/report/matter/billing/invoices-breakdown`). */
  async getMatterBillingInvoicesBreakdown(
    matterId: string,
    filters: Record<string, unknown> = {},
  ): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      const p: GridParams = { page: 0, pageSize: 50, filters: {} }
      return pg([
        {
          id: "inv1",
          invoiceNo: "INV-1001",
          invoicePrefix: "INV-",
          status: "Paid",
          dueAmount: 5000,
          taxableAmount: 4500,
          creditNoteAmount: 0,
          writeOffAmount: 0,
          discountedAmount: 0,
          issueDate: "2026-08-01",
        },
      ] as Record<string, unknown>[], p)
    }
    const p: GridParams = { page: 0, pageSize: 50, filters: {} }
    const res = await axiosClient.get("/api/report/matter/billing/invoices-breakdown", {
      params: {
        matterId,
        pageNumber: 0,
        pageSize: 50,
        lfaId: filters.lfaId ?? "",
        clientId: filters.clientId ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
        invoiceFromDate: filters.invoiceFromDate ?? filters.fromDate ?? "",
        invoiceToDate: filters.invoiceToDate ?? filters.toDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** Utilization — LMS `/utilization` util-report columns + filters. */
  async getUtilization(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(
        (STATIC_UTIL as Record<string, unknown>[]).map((r, i) => flattenUtilizationRow(r, i)),
        p,
      )
    }
    const f = p.filters ?? {}
    const ids = toIdArray(f.responsiblePersonId ?? f.userId ?? f.responsiblePerson)
    const res = await axiosClient.post(
      "/api/report/fee-earners/util-report-by-user-status/v2",
      { responsiblePersonId: ids.length ? ids : (f.userId ?? f.responsiblePersonId ?? "") },
      {
        params: {
          pageNumber: p.page,
          pageSize: p.pageSize,
          active: f.active ?? false,
          departmentId: f.departmentId ?? "",
          matterId: f.matterId ?? "",
          fromDate: f.fromDate ?? "",
          toDate: f.toDate ?? "",
        },
      },
    )
    const page = unwrap(res.data?.data ?? res.data, p)
    return { ...page, content: page.content.map((r, i) => flattenUtilizationRow(r, i)) }
  },

  async requestUtilizationExcel(filters: Record<string, unknown> = {}) {
    const ids = toIdArray(filters.responsiblePersonId ?? filters.userId ?? filters.responsiblePerson)
    return excelMsg("/api/reports/export-excel/fee-earners/util-report/excel", {
      active: filters.active ?? false,
      departmentId: filters.departmentId ?? "",
      matterId: filters.matterId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      responsiblePersonId: ids[0] ?? filters.userId ?? "",
    })
  },

  async getActivityHistory(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const f = p.filters ?? {}
      const list = (staticActivityFeed as Record<string, unknown>[]).map((a, i) => ({
        id: a.id,
        activityId: a.id,
        activityCategory: String(a.entity ?? "MATTER").toUpperCase() === "MATTER" ? "MATTER" : "CLIENT",
        clientName: String(a.entity === "Client" || a.entity === "Lead" ? a.entityName : "Al Rashid Holdings"),
        clientId: a.entity === "Client" ? a.entityId : "c1",
        matterTitle: a.entity === "Matter" ? a.entityName : "260303 — Building Dispute",
        matterId: a.entity === "Matter" ? a.entityId : "6a4f9f5e096c2631a41a8193",
        matterSubject: "Sample subject",
        billingType: "Hourly",
        createdBy: a.actor,
        activityResponsiblePerson: a.actor,
        activityCreatedAt: a.createdAt,
        modificationDate: a.createdAt,
        activityModificationType: i % 2 === 0 ? "EDIT" : "APPROVED",
        beforeHours: 2,
        beforeMinutes: 0,
        afterHours: 3,
        afterMinutes: 30,
        hoursInUnitBefore: 2,
        hoursInUnitAfter: 3.5,
        hoursChangeInUnit: 1.5,
        rate: 1000,
        amount: 1500,
        logSummary: a.description,
        activityNote: a.description,
      }))
      let filtered = list
      if (f.activityCategory) {
        filtered = filtered.filter(r => r.activityCategory === f.activityCategory)
      }
      if (f.modificationType) {
        filtered = filtered.filter(r => r.activityModificationType === f.modificationType)
      }
      if (f.clientId) {
        filtered = filtered.filter(r => r.clientId === f.clientId)
      }
      if (f.matterId) {
        filtered = filtered.filter(r => r.matterId === f.matterId)
      }
      return pg(filtered, p)
    }
    const f = p.filters ?? {}
    const categoryRaw = String(f.activityCategory ?? "")
    const res = await axiosClient.get("/api/report/activity/history", {
      params: {
        sortBy: "modificationDate",
        direction: "desc",
        pageNumber: p.page,
        pageSize: p.pageSize,
        ...(categoryRaw ? { activityCategory: categoryRaw } : {}),
        ...(f.clientId ? { clientId: f.clientId } : {}),
        ...(f.matterId ? { matterId: f.matterId } : {}),
        ...(f.modificationType ? { activityModificationType: f.modificationType } : {}),
        ...(f.userId || f.responsiblePersonId
          ? { responsiblePersonId: f.userId ?? f.responsiblePersonId }
          : {}),
        ...(f.performedById ? { performedById: f.performedById } : {}),
        ...(f.fromDate ? { fromDate: f.fromDate } : {}),
        ...(f.toDate ? { toDate: f.toDate } : {}),
      },
    })
    // LMS returns Spring page at top level (content / totalElements)
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestActivityHistoryExcel(filters: Record<string, unknown> = {}) {
    const categoryRaw = String(filters.activityCategory ?? "")
    return excelMsg("/api/reports/export-excel/activity/history", {
      activityCategory: categoryRaw === "All" ? "" : categoryRaw,
      activityModificationType: filters.modificationType ?? "",
      responsiblePersonId: filters.userId ?? filters.responsiblePersonId ?? "",
      performedById: filters.performedById ?? "",
      matterId: filters.matterId ?? "",
      clientId: filters.clientId ?? "",
      leadId: filters.leadId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
    })
  },

  /**
   * Collections report — LMS returns `{ invoices, reciepts }` (note spelling).
   * Rows are receipt payments; totals from invoices.dueAmount + receipts.amount.
   */
  async getCollections(p: GridParams): Promise<PageResponse<Record<string, unknown>> & {
    totalDue?: number
    totalPaid?: number
  }> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const receipts = collectionsReport as Record<string, unknown>[]
      const page = pg(receipts, p)
      return {
        ...page,
        totalDue: receipts.reduce((s, r) => s + Number(r.dueAmount ?? r.totalInvoiced ?? 0), 0),
        totalPaid: receipts.reduce((s, r) => s + Number(r.amount ?? r.totalPaid ?? 0), 0),
      }
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/collections", {
      params: {
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
      },
    })
    const raw = res.data?.data ?? res.data ?? {}
    const invoices = (Array.isArray(raw.invoices) ? raw.invoices : []) as Record<string, unknown>[]
    const receipts = (Array.isArray(raw.reciepts)
      ? raw.reciepts
      : Array.isArray(raw.receipts) ? raw.receipts : []) as Record<string, unknown>[]
    const totalDue = invoices.reduce((s, c) => s + Number(c.dueAmount ?? 0), 0)
    const totalPaid = receipts.reduce((s, c) => s + Number(c.amount ?? 0), 0)
    const rows = receipts.map((r, i) => {
      const inv = (r.invoice ?? {}) as Record<string, unknown>
      return {
        id: String(r.id ?? `rcpt-${i}`),
        dueAmount: Number(inv.dueAmount ?? r.dueAmount ?? 0),
        amount: Number(r.amount ?? 0),
        paymentMode: String(r.paymentMode ?? "—"),
        paymentDate: String(r.paymentDate ?? ""),
        invoiceNo: String(inv.invoiceNo ?? r.invoiceNo ?? "—"),
        clientName: String(
          (inv.clientMini as { companyName?: string; firstName?: string } | undefined)?.companyName
          ?? (inv.clientMini as { firstName?: string } | undefined)?.firstName
          ?? r.clientName
          ?? "—",
        ),
      }
    })
    return { ...pg(rows, p), totalDue, totalPaid }
  },

  async getMarginErosion(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(marginErosionReport as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const groupByMatter = f.groupByMatter !== false && f.groupByMatter !== "false"
    const path = groupByMatter
      ? "/api/report/fee-earners/revenue/matter-erosion-activities-group-by-matter"
      : "/api/report/fee-earners/revenue/matter-erosion-activities"
    const res = await axiosClient.get(path, {
      params: {
        departmentId: f.departmentId ?? "",
        billingType: f.billingType ?? "Hourly",
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        responsiblePersonId: f.responsiblePersonId ?? f.userId ?? "",
        page: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy || "matterTitle",
        sortDirection: p.sortDir || "desc",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestMarginErosionExcel(filters: Record<string, unknown> = {}) {
    const groupByMatter = filters.groupByMatter !== false && filters.groupByMatter !== "false"
    const path = groupByMatter
      ? "/api/reports/export-excel/fee-earners/download-margin-erosion-report-group-by-matter"
      : "/api/reports/export-excel/fee-earners/download-margin-erosion-report"
    return excelMsg(path, {
      departmentId: filters.departmentId ?? "",
      billingType: filters.billingType ?? "Hourly",
      clientId: filters.clientId ?? "",
      matterId: filters.matterId ?? "",
      responsiblePersonId: filters.responsiblePersonId ?? filters.userId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      sortBy: filters.sortBy ?? "matterTitle",
      sortDirection: filters.sortDirection ?? "desc",
    }, "post")
  },

  wipSummary: () => env.USE_STATIC_DATA
    ? Promise.resolve({
        totalWip: STATIC_WIP.reduce((s, r) => s + r.totalAmount, 0),
        totalHours: STATIC_WIP.reduce((s, r) => s + r.totalHours, 0),
        byUser: Object.entries(
          STATIC_WIP.reduce((acc, r) => ({ ...acc, [r.userName]: (acc[r.userName] ?? 0) + r.totalAmount }), {} as Record<string, number>),
        ).map(([name, amount]) => ({ name, amount })),
        byStatus: Object.entries(
          STATIC_WIP.reduce((acc, r) => ({ ...acc, [r.revenueStatus]: (acc[r.revenueStatus] ?? 0) + 1 }), {} as Record<string, number>),
        ).map(([name, count]) => ({ name, count })),
      })
    : Promise.resolve(
        // Derive summary from fee-earners list when dedicated summary endpoint is unavailable
        axiosClient.get("/api/report/wip-reports/fee-earners", {
          params: { pageNumber: 0, pageSize: 200, invoiceCreated: false },
        }).then(r => {
          const content = (r.data?.data?.content ?? r.data?.content ?? []) as Record<string, unknown>[]
          const totalWip = content.reduce((s, row) => s + Number(row.totalAmount ?? row.amount ?? 0), 0)
          const totalHours = content.reduce((s, row) => s + Number(row.totalHours ?? row.hours ?? 0), 0)
          const byUserMap: Record<string, number> = {}
          const byStatusMap: Record<string, number> = {}
          content.forEach(row => {
            const name = String(row.userName ?? row.responsiblePersonName ?? "Unknown")
            const status = String(row.revenueStatus ?? "Unknown")
            byUserMap[name] = (byUserMap[name] ?? 0) + Number(row.totalAmount ?? 0)
            byStatusMap[status] = (byStatusMap[status] ?? 0) + 1
          })
          return {
            totalWip,
            totalHours,
            byUser: Object.entries(byUserMap).map(([name, amount]) => ({ name, amount })),
            byStatus: Object.entries(byStatusMap).map(([name, count]) => ({ name, count })),
          }
        }).catch(() => ({ totalWip: 0, totalHours: 0, byUser: [], byStatus: [] })),
      ),

  matterHistory: () => env.USE_STATIC_DATA
    ? Promise.resolve(staticDash.matterHistory)
    : axiosClient.get("/api/analytics/graph/matters-history-monthly").then(r => r.data?.data ?? []),

  revenue: () => env.USE_STATIC_DATA
    ? Promise.resolve(staticDash.revenue)
    : axiosClient.get("/api/analytics/graph/fixedfees-timelogs-revenue").then(r => r.data?.data ?? []),

  /** Generic GET report list helper used by SimpleReportPage configs. */
  async fetchReport(
    path: string,
    p: GridParams,
    paramMap: (f: Record<string, unknown>) => Record<string, unknown> = f => f,
    staticRows: Record<string, unknown>[] = [],
    method: "get" | "post" = "get",
  ): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(staticRows.length ? staticRows : [{ id: "1", note: "Sample row (static mode)" }], p)
    }
    const f = p.filters ?? {}
    const params = {
      pageNumber: p.page,
      pageSize: p.pageSize,
      ...paramMap(f),
    }
    const res = method === "post"
      ? await axiosClient.post(path, {}, { params })
      : await axiosClient.get(path, { params })
    return unwrap(res.data?.data ?? res.data, p)
  },

  getDues: (p: GridParams) => reportsApi.fetchReport("/api/report/dues", p, f => ({
    clientId: f.clientId ?? "",
    matterId: f.matterId ?? "",
    days: f.days ?? "",
  }), [
    {
      id: "d1",
      clientMini: { id: "c1", companyName: "Al Rashid Holdings" },
      invoicePrefix: "INV-",
      invoiceNo: "2025-001",
      issueDate: "2026-07-01",
      dueDate: "2026-07-31",
      dueAmount: 12000,
    },
    {
      id: "d2",
      clientMini: { id: "c2", firstName: "Emily Harper" },
      invoiceNo: "2025-002",
      issueDate: "2026-06-01",
      dueDate: "2026-06-30",
      dueAmount: 4500,
    },
  ]),

  requestDuesExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/dues", {
    clientId: filters.clientId ?? "",
    matterId: filters.matterId ?? "",
    days: filters.days ?? "",
  }),

  getMattersReport: (p: GridParams) => reportsApi.fetchReport("/api/report/matter/mini/filter/v2", p, f => ({
    clientId: f.clientId ?? "",
    departmentId: f.departmentId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "m1", title: "260303 — Building Dispute", status: "Open", clientName: "Al Rashid Holdings", billingType: "Hourly" },
  ], "post"),

  requestMattersReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/matter/excel", {
    clientId: filters.clientId ?? "",
    departmentId: filters.departmentId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  getTasksReport: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks", p, f => ({
    type: f.eventType ?? "ALL",
    clientId: f.clientId ?? "",
    userId: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "t1", taskName: "Draft memo", taskStatus: "Pending", priority: "High", assignedTo: "Sarah Johnson" },
  ], "post"),

  requestTasksReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/tasks", {
    clientId: filters.clientId ?? "",
    userId: filters.userId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  /** LMS Email Excel: POST `/reports/export-excel/hearings/excel` + attorney body. */
  async requestHearingsReportExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Excel will be emailed shortly."
    }
    const attorneyIds = toIdArray(filters.attorneyIds ?? filters.attorney)
    const attendedAttorneyIds = toIdArray(filters.attendedAttorneyIds ?? filters.attendedAttorney)
    const params = {
      caseNo: filters.caseNo ?? "",
      caseType: filters.caseType ?? "",
      caseYear: filters.caseYear ?? "",
      clientId: filters.clientId ?? "",
      hearingLocation: filters.hearingLocation ?? "",
      hearingType: filters.hearingType ?? "",
      matterId: filters.matterId ?? "",
      hearingfromDate: filters.hearingfromDate ?? filters.fromDate ?? "",
      hearingToDate: filters.hearingToDate ?? filters.toDate ?? "",
      nextHearingDate: filters.nextHearingDate ?? filters.nextHearingFromDate ?? "",
      nextToHearingDate: filters.nextToHearingDate ?? filters.nextHearingToDate ?? "",
      attendedAttorneyId: attendedAttorneyIds[0] ?? "",
      attorney: attorneyIds[0] ?? "",
      pageNumber: 0,
      pageSize: 50,
    }
    const res = await axiosClient.post(
      "/api/reports/export-excel/hearings/excel",
      { attorneyIds, attendedAttorneyIds },
      { params },
    )
    const dataMsg = typeof res.data?.data === "string" ? res.data.data : undefined
    return res.data?.Msg ?? res.data?.message ?? dataMsg ?? "Excel export requested."
  },

  requestInvoicesReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/invoice/filter/all/excel", {
    clientId: filters.clientId ?? "",
    matterId: filters.matterId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  requestLeadsReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/leads", {
    userId: filters.userId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  /** Generic email-excel helper for remaining SimpleReportPage shells. */
  requestReportExcel: (path: string, filters: Record<string, unknown> = {}, method: "get" | "post" = "get") =>
    excelMsg(path, filters, method),

  /** LMS Hearings Report — POST `/report/hearings/mini/page` + attorney body → `hearingsMinis`. */
  async getHearingsReport(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "h1",
          hearingId: "h1",
          matterId: "m1",
          hearingTitle: "CMC",
          matterTitle: "260303",
          hearingDate: "2026-09-25",
          hearingTime: "10:00",
          location: "Dubai Courts",
          hearingLocation: { id: "loc1", name: "Dubai Courts" },
          hearingsType: { id: "ht1", name: "CMC" },
          caseNo: "123/2026",
          caseType: "Civil",
          caseYear: "2026",
          chamberNo: "3",
          attorneyName: "Sarah Johnson",
          attendedAttorneyName: "Sarah Johnson",
          attorneyId: "u1",
          attendedAttorneyId: "u1",
          description: "Prepare witness list",
          note: "",
          summary: "",
          prvSummary: "Directions given",
          nextHearingDate: "2026-10-10",
          current: true,
          status: "OPEN",
          matterMini: { title: "260303 — Building Dispute", matterId: "m1" },
          clientMini: { client: { clientType: "PERSON", firstName: "Ahmed", lastName: "Hassan" } },
        },
      ], p)
    }
    const f = p.filters ?? {}
    const attorneyIds = toIdArray(f.attorneyIds ?? f.attorney)
    const attendedAttorneyIds = toIdArray(f.attendedAttorneyIds ?? f.attendedAttorney)
    const params = {
      pageNumber: p.page,
      pageSize: p.pageSize,
      caseNo: f.caseNo ?? "",
      caseType: f.caseType ?? "",
      caseYear: f.caseYear ?? "",
      clientId: f.clientId ?? "",
      hearingLocation: f.hearingLocation ?? "",
      hearingType: f.hearingType ?? "",
      matterId: f.matterId ?? "",
      hearingfromDate: f.hearingfromDate ?? f.fromDate ?? "",
      hearingToDate: f.hearingToDate ?? f.toDate ?? "",
      nextHearingDate: f.nextHearingDate ?? f.nextHearingFromDate ?? "",
      nextToHearingDate: f.nextToHearingDate ?? f.nextHearingToDate ?? "",
    }
    const res = await axiosClient.post(
      "/api/report/hearings/mini/page",
      { attorneyIds, attendedAttorneyIds },
      { params },
    )
    const raw = res.data?.data ?? res.data
    return unwrap(raw, p)
  },

  getProfitLoss: (p: GridParams) => reportsApi.fetchReport("/api/report/fee-earners/revenue/profit-and-loss", p, f => ({
    departmentId: f.departmentId ?? "",
    responsiblePerson: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "pl1", userName: "Sarah Johnson", revenue: 85000, cost: 42000, profit: 43000 },
  ]),

  /** LMS Email Excel — P&L (`/report/fee-earners/revenue/profit-and-loss/excel`). */
  requestProfitLossExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/report/fee-earners/revenue/profit-and-loss/excel", {
    billingType: filters.billingType && filters.billingType !== "ALL" ? filters.billingType : "",
    clientId: filters.clientId ?? "",
    departmentId: filters.departmentId ?? "",
    fromDate: filters.fromDate ?? "",
    matterId: filters.matterId ?? "",
    responsiblePersonId: filters.userId ?? filters.responsiblePersonId ?? filters.responsiblePerson ?? "",
    sortBy: "responsiblePersonName",
    sortDirection: "asc",
    toDate: filters.toDate ?? "",
  }),

  getAttorneyRevenue: (p: GridParams) => reportsApi.fetchReport("/api/report/fee-earners/revenue/billed", p, f => ({
    departmentId: f.departmentId ?? "",
    responsiblePerson: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "ar1", userName: "Sarah Johnson", billed: 85000, collected: 75000 },
  ]),

  /** LMS Email Excel — attorney revenue hourly tab (`revenues-report/hourly`). */
  requestAttorneyRevenueExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/fee-earners/revenues-report/hourly", {
    responsiblePersonId: filters.userId ?? filters.responsiblePersonId ?? filters.responsiblePerson ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
    departmentId: filters.departmentId ?? "",
    matterId: filters.matterId ?? "",
    clientId: filters.clientId ?? "",
  }),

  getReferralReport: (p: GridParams) => reportsApi.fetchReport("/api/report/lfa/referral", p, f => ({
    billingType: f.billingType ?? "",
    clientId: f.clientId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "rf1", referralParty: "Mohammad Ovesh", referralSource: "Internal", amount: 15000 },
  ]),

  /** LMS Email Excel — referral (`lfa/referral/excel`). */
  requestReferralReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/lfa/referral/excel", {
    billingType: filters.billingType ?? "",
    clientId: filters.clientId ?? "",
    externalRefer: filters.externalRefer ?? "",
    lfaId: filters.lfaId ?? filters.agreementId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
    pageNumber: 0,
    pageSize: 101,
  }),

  /** Non-converted leads — LMS `/non-converted-leads` (status + date filters). */
  async getNonConvertedLeads(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "nc1", leadId: "l1", leadName: "Prospect Co", leadType: "People", status: "Open",
          email: "prospect@co.ae", phone: "+971501111111", scopeOfWork: "Corporate advisory engagement",
          responsiblePersonName: "Sarah Johnson", hours: 12, minutes: 30, hourlyUnit: "Hour",
          rate: 1000, total: 12500, leadEstimate: 20000, approvedEstimate: 18000,
        },
        {
          id: "nc2", leadId: "l2", leadName: "Writeoff Lead LLC", leadType: "Company", status: "Write Off",
          email: "wo@lead.ae", phone: "+971502222222", scopeOfWork: "Dispute review",
          responsiblePersonName: "Dory Abi Khalil", hours: 4, minutes: 0, hourlyUnit: "Hour",
          rate: 800, total: 3200, leadEstimate: 5000, approvedEstimate: 0,
        },
      ], p)
    }
    const f = p.filters ?? {}
    const statusRaw = String(f.status ?? "")
    const status = statusRaw === "Write Off" ? "writeoff" : statusRaw
    const res = await axiosClient.get("/api/report/lead/activity-time", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy ?? "leadName",
        sortDirection: p.sortDir ?? "asc",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        status,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** LMS Email Excel — non-converted leads (`lead/activity-time/excel`). */
  requestNonConvertedLeadsExcel: (filters: Record<string, unknown> = {}) => {
    const statusRaw = String(filters.status ?? "")
    const status = statusRaw === "Write Off" ? "writeoff" : statusRaw
    return excelMsg("/api/reports/export-excel/lead/activity-time/excel", {
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      status,
    })
  },

  getPurgedDiscounted: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/statistics/purged-discounted", p, f => ({
    departmentId: f.departmentId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "pd1", activity: "Research", purgedHours: 2, discountedAmount: 500 },
  ]),

  getCostAnalysis: (p: GridParams) => reportsApi.fetchReport("/api/report/lfa/cost-analysis", p, f => ({
    matterId: f.matterId ?? "",
    clientId: f.clientId ?? "",
    lfaId: f.lfaId ?? f.agreementId ?? "",
    billingType: f.billingType ?? "Hourly",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    {
      id: "ca1",
      lfaNo: "LFA-001",
      totalTime: "12 hours 0 minutes",
      costOfHours: 25000,
      billedAmount: 40000,
      difference: 15000,
      matterMini: {
        matterId: "m1",
        title: "260303 — Building Dispute",
        status: "OPEN",
        clientMini: { clientId: "c1", client: { companyName: "Al Rashid Holdings", clientType: "COMPANY" } },
      },
    },
  ]),

  /** LMS Email Excel — cost analysis (`cost-analysis/excel`). */
  requestCostAnalysisExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/cost-analysis/excel", {
    matterId: filters.matterId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
    lfaId: filters.lfaId ?? filters.agreementId ?? "",
    billingType: filters.billingType ?? "Hourly",
  }),

  /**
   * Zoho Outstanding report — OLD ZohoReportTabs.
   * Clients tab: GET /client/zoho → POST /zoho/outstanding { type: "customer" }
   * Invoices tab: GET /invoice/zoho → POST /zoho/outstanding { type: "invoice" }
   */
  async getZohoOutstandingClients(): Promise<Array<{ id: string; clientId: string; label: string; zohoClientId: string }>> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "c1", clientId: "c1", label: "Al Rashid Holdings", zohoClientId: "ZOHO-1001" },
        { id: "c2", clientId: "c2", label: "Emily Harper", zohoClientId: "ZOHO-1002" },
      ]
    }
    const res = await axiosClient.get("/api/client/zoho", { params: { isPaginated: false } })
    const raw = res.data?.data ?? res.data ?? []
    const list = (Array.isArray(raw) ? raw : raw.content ?? []) as Record<string, unknown>[]
    return list
      .filter(c => c.zohoClientId != null && String(c.zohoClientId).trim() !== "")
      .map(c => {
        const clientId = String(c.clientId ?? c.id ?? "")
        const isPerson = String(c.clientType ?? "") === "PERSON"
        const label = isPerson
          ? `${String(c.firstName ?? "")} ${String(c.lastName ?? "")}`.trim() || String(c.clientName ?? clientId)
          : String(c.companyName ?? c.clientName ?? clientId)
        return { id: clientId, clientId, label, zohoClientId: String(c.zohoClientId) }
      })
  },

  async getZohoOutstandingInvoiceOptions(month: string, year: number): Promise<Array<{
    id: string
    label: string
    zohoInvoiceId: string
    invoiceNo?: string
  }>> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "inv1", label: "INV-ZOHO-1 — Al Rashid Holdings", zohoInvoiceId: "ZINV-1", invoiceNo: "INV-ZOHO-1" },
        { id: "inv2", label: "INV-ZOHO-2 — Emily Harper", zohoInvoiceId: "ZINV-2", invoiceNo: "INV-ZOHO-2" },
      ]
    }
    const res = await axiosClient.get("/api/invoice/zoho", {
      params: { isPaginated: false, month, year, status: "Due" },
    })
    const raw = res.data?.data ?? res.data ?? []
    const list = (Array.isArray(raw) ? raw : raw.content ?? []) as Record<string, unknown>[]
    return list
      .filter(inv => inv.zohoInvoiceId != null && String(inv.zohoInvoiceId).trim() !== "")
      .map(inv => {
        const id = String(inv.id ?? inv.invoiceId ?? "")
        const no = String(inv.invoiceNo ?? inv.invoiceNumber ?? id)
        const client = String(inv.clientName ?? inv.customerName ?? "")
        return {
          id,
          invoiceNo: no,
          zohoInvoiceId: String(inv.zohoInvoiceId),
          label: client ? `${no} — ${client}` : no,
        }
      })
  },

  async postZohoOutstandingCustomers(customerIds: string[]): Promise<{
    rows: Record<string, unknown>[]
    errorMessage?: string
  }> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return {
        rows: customerIds.map((id, i) => ({
          id,
          contactName: i === 0 ? "Al Rashid Holdings" : "Emily Harper",
          customerName: i === 0 ? "Al Rashid Holdings" : "Emily Harper",
          companyName: i === 0 ? "Al Rashid Holdings" : "—",
          outstandingReceivable: i === 0 ? 8500 : 1200,
          outstandingPayable: 0,
          status: "active",
          legalEagleId: id,
          contactId: `ZOHO-${1001 + i}`,
          createdAt: "2026-01-10",
        })),
      }
    }
    const res = await axiosClient.post("/api/zoho/outstanding", {
      customerId: customerIds,
      invoiceId: [],
      type: "customer",
    })
    return parseZohoOutstandingMap(res.data?.Msg ?? res.data, "customer")
  },

  async postZohoOutstandingInvoices(invoiceIds: string[]): Promise<{
    rows: Record<string, unknown>[]
    errorMessage?: string
  }> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return {
        rows: invoiceIds.map((id, i) => ({
          id,
          customerName: i === 0 ? "Al Rashid Holdings" : "Emily Harper",
          invoiceNumber: `INV-ZOHO-${i + 1}`,
          amount: i === 0 ? 15000 : 4200,
          balance: i === 0 ? 8500 : 1200,
          currencyCode: "AED",
          referenceNumber: `REF-${i + 1}`,
          createdBy: "Sarah Johnson",
          status: "overdue",
          dueDate: "2026-08-01",
        })),
      }
    }
    const res = await axiosClient.post("/api/zoho/outstanding", {
      invoiceId: invoiceIds,
      customerId: [],
      type: "invoice",
    })
    return parseZohoOutstandingMap(res.data?.Msg ?? res.data, "invoice")
  },

  getInvoicesReport: (p: GridParams) => reportsApi.fetchReport("/api/report/invoice/filter", p, f => ({
    clientId: f.clientId ?? "",
    matterId: f.matterId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "inv1", invoiceNo: "INV-1001", clientName: "Al Rashid Holdings", totalAmount: 15000, status: "Paid" },
  ]),

  getLeadsReport: (p: GridParams) => reportsApi.fetchReport("/api/report/lead/filter", p, f => ({
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
    userId: f.userId ?? "",
  }), [
    { id: "ld1", leadName: "Prospect Co", status: "Open", ownerName: "Sarah Johnson", value: 25000 },
  ], "post"),

  getActivitiesReport: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/filter/m/v2", p, f => activitiesReportFilterParams(f), [
    { id: "act1", activityName: "Document Review", matterTitle: "260303", matterSubject: "Building Dispute", hours: 3, minutes: 30, rate: 1000, billing: 3500, clientName: "Al Rashid Holdings", activityType: "UnBilled", billable: true, responsiblePersonName: "Sarah Johnson", departmentName: "Litigation", lfaNo: "LFA-001", entryDate: "2026-07-01" },
  ], "post"),

  /** Email Excel for time-log activities report (LMS `/reports/export-excel/activity/excel`). */
  requestActivitiesReportExcel: (filters: Record<string, unknown> = {}) =>
    excelMsg("/api/reports/export-excel/activity/excel", activitiesReportFilterParams(filters)),

  getDepositBalance: (p: GridParams) => reportsApi.fetchReport("/api/report/deposit/balance/amount/v2", p, f => ({
    clientId: f.clientId ?? "",
    lfaId: f.lfaId ?? "",
  }), [
    { id: "dep1", clientName: "Al Rashid Holdings", agreementNo: "LFA-001", balance: 5000 },
  ]),

  /** LMS Email Excel — deposit balance (`deposit-balance-amount/v2`). */
  requestDepositBalanceExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/deposit-balance-amount/v2", {
    lfaId: filters.lfaId ?? "",
    clientId: filters.clientId ?? "",
  }),

  getUserTimelogEntries: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/statistics/by-person", p, f => ({
    userId: f.userId ?? "", departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "ute1", userName: "Sarah Johnson", totalHours: 42, billableHours: 38, nonBillableHours: 4, departmentName: "Litigation" },
  ]),

  /** LMS Email Excel — user timelog entries (`activity/statistics/by-person/excel`). */
  requestUserTimelogEntriesExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/activity/statistics/by-person/excel", {
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
    sortBy: "totalHours",
    sortDir: "DESC",
  }),

  getRatingReport: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks/rating", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "rt1", userName: "Sarah Johnson", averageRating: 4.5, taskCount: 12 },
  ]),

  /** LMS Email Excel — rating report (`average-rating`). */
  requestRatingReportExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/average-rating", {
    userId: filters.userId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  /** LMS Posts report — converted People leads (`/leads/get/list?type=People&status=Converted`). */
  async getPostsReport(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "p1",
          typeLead: "People",
          leadSource: "Website",
          firstName: "Ali",
          middleName: "",
          lastName: "Hassan",
          status: "Converted",
        },
      ], p)
    }
    const res = await axiosClient.get("/api/leads/get/list", {
      params: {
        type: "People",
        status: "Converted",
        page: p.page,
        pageSize: p.pageSize,
      },
    })
    const raw = res.data?.data ?? res.data ?? {}
    const leads = (Array.isArray(raw)
      ? raw
      : Array.isArray(raw.leads) ? raw.leads
        : Array.isArray(raw.content) ? raw.content
          : []) as Record<string, unknown>[]
    const total = Number(raw.count ?? raw.totalElements ?? leads.length)
    return {
      content: leads.map((l, i) => ({
        ...l,
        id: String(l.id ?? l.leadId ?? i),
      })),
      totalElements: total,
      totalPages: Math.ceil(total / (p.pageSize || 1)) || 0,
      number: p.page,
      size: p.pageSize,
      first: p.page === 0,
      last: (p.page + 1) * p.pageSize >= total,
      empty: leads.length === 0,
    }
  },

  getWipAttorney: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners", p, f => ({
    responsiblePerson: f.userId ?? "", departmentId: f.departmentId ?? "", matterId: f.matterId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "", invoiceCreated: false,
  }), [
    {
      id: "wa1",
      responsiblePerson: "Sarah Johnson",
      department: { name: "Litigation" },
      totalHours: "12 hours 0 minutes",
      totalUnbilledHours: "4 hours 0 minutes",
      wipAmount: 12000,
    },
  ]),

  /** LMS Email Excel — attorney tab (`fee-earners/excel`). */
  requestWipAttorneyExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/wip-reports/fee-earners/excel", {
    responsiblePerson: filters.userId ?? filters.responsiblePerson ?? "",
    departmentId: filters.departmentId ?? "",
    matterId: filters.matterId ?? "",
    clientId: "",
    invoiceCreated: false,
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  getWipMatter: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners/by-matter", p, f => ({
    matterId: f.matterId ?? "",
    departmentId: f.departmentId ?? "",
    responsiblePerson: f.userId ?? f.responsiblePerson ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    {
      id: "wm1",
      responsiblePerson: "Sarah Johnson",
      department: { name: "Litigation" },
      matterMini: {
        title: "260303",
        matterId: "m1",
        departmentName: "Litigation",
        clientMini: { companyName: "Al Rashid Holdings" },
      },
      totalHours: "12 hours 0 minutes",
      totalUnbilledHours: "4 hours 0 minutes",
      wipAmount: 12000,
    },
  ]),

  /** LMS Email Excel — matter tab (`fee-earners-by-matter/excel`). */
  requestWipMatterExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/wip-reports/fee-earners-by-matter/excel", {
    matterId: filters.matterId ?? "",
    departmentId: filters.departmentId ?? "",
    responsiblePerson: filters.userId ?? filters.responsiblePerson ?? "",
    clientId: "",
    invoiceCreated: false,
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  /** LMS WIP Department tab — `/report/wip-reports/fee-earners/by-dept`. */
  getWipDepartment: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners/by-dept", p, f => ({
    departmentId: f.departmentId ?? "",
    matterId: f.matterId ?? "",
    attorneyId: f.userId ?? f.attorneyId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "wd1", department: { name: "Litigation" }, totalHours: "12 hours 0 minutes", totalUnbilledHours: "4 hours 0 minutes", wipAmount: 12000 },
  ]),

  /** LMS Email Excel — department tab (`fee-earners-by-dept/excel`). */
  requestWipDepartmentExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/wip-reports/fee-earners-by-dept/excel", {
    departmentId: filters.departmentId ?? "",
    matterId: filters.matterId ?? "",
    attorneyId: filters.userId ?? filters.attorneyId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  getRetainerStatementReport: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks", p, f => ({
    clientId: f.clientId ?? "", matterId: f.matterId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "rs1", clientName: "Al Rashid Holdings", matterTitle: "260303", balance: 5000, status: "Active" },
  ]),

  getMatterSummary: (p: GridParams) => reportsApi.fetchReport("/api/report/matter/mini/filter", p, f => ({
    clientId: f.clientId ?? "", userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "ms1", title: "260303", clientName: "Al Rashid", attorneyName: "Sarah Johnson", status: "Open", billingType: "Hourly" },
  ], "post"),

  /**
   * Closed matters form report — LMS `/closed/matters`.
   * List: GET `/matter/close/form/list`; Search: POST `/matter/close/form/search` `{ keySearch }`.
   */
  async getClosedMatters(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "cm1",
          matterId: "m1",
          closeDate: "2026-08-01",
          fileNo: "F-100",
          fileTitle: "Building Dispute File",
          responsibleAttorneyName: "Sarah Johnson",
          finalResponsibleAttorneyName: "Dory Abi Khalil",
          materialReturnToClient: "Yes",
          retainedMaterial: "No",
          destroyedMaterial: "No",
          materialReceivedDate: "2026-07-15",
          note: "Settled amicably",
          outstandingFees: 0,
          outstandingCosts: 500,
          remainingFundInTrust: 0,
          matterMini: {
            matterId: "m1",
            title: "260280 — Settled Dispute",
            description: "Commercial settlement",
            closeByName: "Admin User",
            clientMini: { clientId: "c1", companyName: "Al Rashid Holdings", clientType: "COMPANY" },
          },
        },
      ], p)
    }
    const f = p.filters ?? {}
    const keySearch = String(f.keySearch ?? f.search ?? f.q ?? "").trim()
    if (keySearch) {
      const res = await axiosClient.post("/api/matter/close/form/search", { keySearch })
      const raw = res.data?.data ?? res.data ?? []
      const list = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
      return pg(list, { ...p, page: 0 })
    }
    const res = await axiosClient.get("/api/matter/close/form/list", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize + 1,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** Re-open via closed-form id (LMS `PUT /matter/re-open/closeFormId=`). */
  async reopenClosedForm(closeFormId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Matter reopened."
    }
    const res = await axiosClient.put(`/api/matter/re-open/closeFormId=${encodeURIComponent(closeFormId)}`)
    const data = res.data ?? {}
    if (String(data.code) === "403") {
      throw new Error(data.Msg ?? "You do not have permission to reopen this matter.")
    }
    return data.Msg ?? data.message ?? "Matter reopened."
  },

  getFeeEarnerBilled: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners", p, f => ({
    responsiblePerson: f.userId ?? "", departmentId: f.departmentId ?? "", matterId: f.matterId ?? "", invoiceCreated: true, fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "feb1", userName: "Sarah Johnson", matterTitle: "260303", totalHours: 10, totalAmount: 10000, departmentName: "Litigation" },
  ]),

  /** LMS Email Excel — fee earner billed (`wip-reports/billable-excel`). */
  requestFeeEarnerBilledExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/wip-reports/billable-excel", {
    invoiceCreated: true,
    matterId: filters.matterId ?? "",
    clientId: filters.clientId ?? "",
    responsiblePerson: filters.userId ?? filters.responsiblePerson ?? "",
    departmentId: filters.departmentId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }, "post"),

  getTaskAverage: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks/rating", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "ta1", userName: "Sarah Johnson", averageRating: 4.2, taskCount: 8 },
  ]),

  getFixedBalance: (p: GridParams) => reportsApi.fetchReport("/api/report/fixed/balance/amount", p, f => ({
    lfaId: f.lfaId ?? "", clientId: f.clientId ?? "", matterId: f.matterId ?? "",
  }), [
    { id: "fb1", agreementNo: "LFA-001", clientName: "Al Rashid", matterTitle: "260303", balance: 8000, totalAmount: 20000 },
  ]),

  /** LMS Email Excel — fixed balance (`fixed/balance/amount/excel`). */
  requestFixedBalanceExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/fixed/balance/amount/excel", {
    lfaId: filters.lfaId ?? "",
    clientId: filters.clientId ?? "",
  }, "post"),

  getBillingByLfa: (p: GridParams) => reportsApi.fetchReport("/api/report/lfa/billing/v2", p, f => ({
    lfaId: f.lfaId ?? "", clientId: f.clientId ?? "", matterId: f.matterId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "bl1", agreementNo: "LFA-001", clientName: "Al Rashid", matterTitle: "260303", billed: 40000, collected: 35000 },
  ]),

  getBillableByDepartment: (p: GridParams) => reportsApi.fetchReport("/api/report/department/billing/v2", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "bd1", departmentName: "Litigation", totalBilled: 120000, totalPaid: 100000, outstanding: 20000 },
  ]),

  /** LMS Email Excel — billable by department (`department/billing/v2`). */
  requestBillableByDepartmentExcel: (filters: Record<string, unknown> = {}) => excelMsg("/api/reports/export-excel/department/billing/v2", {
    departmentId: filters.departmentId ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  }),

  getAuditReport: (p: GridParams) => reportsApi.fetchReport("/api/audit-record/page", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "au1", action: "UPDATE", entityType: "Matter", userName: "Admin", createdAt: "2026-09-01", details: "Status changed" },
  ]),

  getOnedriveReport: (p: GridParams) => reportsApi.fetchReport("/api/onedrive/matter/folders", p, f => ({
    matterId: f.matterId ?? "", clientId: f.clientId ?? "",
  }), [
    { id: "od1", matterTitle: "260303", folderName: "Building Dispute", path: "/Matters/260303", clientName: "Al Rashid" },
  ]),

  getFavouriteClients: (p: GridParams) => reportsApi.fetchReport("/api/fav/client/list/group", p, f => ({
    clientId: f.clientId ?? "",
  }), [
    { id: "fc1", clientName: "Al Rashid Holdings", userName: "Sarah Johnson", count: 3, createdAt: "2026-07-01" },
  ]),

  getFixedFeeRevenueAllocation: (p: GridParams) => reportsApi.fetchReport("/api/revenue-allocation", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "ff1", matterTitle: "260303", userName: "Sarah Johnson", allocated: 15000, departmentName: "Litigation" },
  ]),

  getProcuredBy: (p: GridParams) => reportsApi.fetchReport("/api/report/procuredby/revenue", p, f => ({
    procuredBy: f.procuredBy ?? f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
    leadConvertedFromDate: f.leadConvertedFromDate ?? "",
    leadConvertedToDate: f.leadConvertedToDate ?? "",
    matterId: f.matterId ?? "",
    clientId: f.clientId ?? "",
    leadSource: f.leadSource ? decodeURIComponent(String(f.leadSource)) : "",
    billingType: f.billingType && f.billingType !== "ALL" ? f.billingType : "",
  }), [
    { id: "pb1", userName: "Sarah Johnson", revenue: 85000, leadCount: 12, matterCount: 8 },
  ]),

  /**
   * LMS Procured-by card report — GET `/report/procuredby/revenue` without flatten
   * (grouped by procuredBy person with nested `details` matters).
   */
  async getProcuredByRevenue(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "pb1",
          procuredByName: "Sarah Johnson",
          totalLeadApprovedEstimate: 120000,
          totalCreditNoteAmount: 5000,
          totalNetAmount: 95000,
          totalWriteOffAmount: 2000,
          matterCount: 2,
          details: [
            {
              matterId: "m1",
              matterTitle: "260303",
              clientId: "c1",
              clientName: "Al Rashid",
              companyName: "Al Rashid Holdings",
              typelead: "company",
              billingType: "Hourly",
              matterDescription: "Building dispute litigation scope",
              billedAmount: 45000,
              creditNotesAmount: 2000,
              leadApprovedEstimate: 60000,
              leadConvertedDate: "2026-07-15",
              Invoices: [
                {
                  invoiceNo: "INV-001",
                  status: "Due",
                  dueAmount: 20000,
                  issueDate: "2026-08-01",
                  creditNoteAmount: 500,
                  discountedAmount: 0,
                  writeOffAmount: 0,
                },
              ],
            },
            {
              matterId: "m2",
              matterTitle: "260293",
              clientId: "c2",
              clientName: "Nour Traders",
              companyName: "Nour Traders LLC",
              typelead: "company",
              billingType: "Fixed",
              matterDescription: "Corporate setup",
              billedAmount: 50000,
              creditNotesAmount: 3000,
              leadApprovedEstimate: 60000,
              leadConvertedDate: "2026-06-01",
              Invoices: [],
            },
          ],
        },
      ], p)
    }
    const f = p.filters ?? {}
    const billingType = f.billingType && f.billingType !== "ALL" ? f.billingType : ""
    const params: Record<string, unknown> = {
      page: p.page,
      pageNumber: p.page,
      pageSize: p.pageSize,
      sortBy: p.sortBy || "matterTitle",
      sortDirection: p.sortDir || "desc",
      fromDate: f.fromDate ?? "",
      toDate: f.toDate ?? "",
      matterId: f.matterId ?? "",
      procuredBy: f.procuredBy ?? f.userId ?? "",
      leadConvertedFromDate: f.leadConvertedFromDate ?? "",
      leadConvertedToDate: f.leadConvertedToDate ?? "",
      leadSource: f.leadSource ? decodeURIComponent(String(f.leadSource)) : "",
      billingType,
    }
    if (f.clientId) params.clientId = f.clientId
    const res = await axiosClient.get("/api/report/procuredby/revenue", { params })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** LMS Excel — GET `/reports/export-excel/fee-earners/download-procuredby-value-report`. */
  async requestProcuredByExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Excel downloaded successfully"
    }
    const billingType = filters.billingType && filters.billingType !== "ALL" ? filters.billingType : ""
    const params: Record<string, unknown> = {
      sortBy: filters.sortBy || "matterTitle",
      sortDirection: filters.sortDirection || filters.sortDir || "desc",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      matterId: filters.matterId ?? "",
      procuredBy: filters.procuredBy ?? filters.userId ?? "",
      leadConvertedFromDate: filters.leadConvertedFromDate ?? "",
      leadConvertedToDate: filters.leadConvertedToDate ?? "",
      leadSource: filters.leadSource ? decodeURIComponent(String(filters.leadSource)) : "",
      billingType,
      includeDetails: true,
    }
    if (filters.clientId) params.clientId = filters.clientId
    const res = await axiosClient.get(
      "/api/reports/export-excel/fee-earners/download-procuredby-value-report",
      { params },
    )
    const fileUrl = typeof res.data?.data === "string" ? res.data.data : undefined
    if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
      const link = document.createElement("a")
      link.href = fileUrl
      link.setAttribute("download", "Procured-By-Value-Report.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
      return "Excel downloaded successfully"
    }
    return res.data?.Msg ?? res.data?.message ?? fileUrl ?? "Excel export requested."
  },

  /** LMS Lead Value — GET `/report/procuredby/revenue` with flatten + converted/invoice filters. */
  async getLeadValue(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "lv1",
          typeLead: "COMPANY",
          companyName: "Prospect Holdings",
          firstName: "",
          leadConvertedDate: "2026-07-15",
          leadSource: "Website",
          attorneyName: "Sarah Johnson",
          addedByName: "Admin User",
          procuredByName: "Sarah Johnson",
          departmentName: "Litigation",
          practiceAreaName: "Commercial",
          clientName: "Al Rashid Holdings",
          clientId: "c1",
          matterId: "m1",
          matterTitle: "260303",
          matterDescription: "Building dispute scope of work for litigation",
          lfaNumber: "LFA-001",
          billingType: "Hourly",
          estimate: 50000,
          fixedFee: null,
          leadApprovedEstimate: 45000,
          matterCreatedDate: "2026-07-01",
          actualAmount: 32000,
          Invoices: [
            { creditNoteAmount: 1000, creditNoteVatAmount: 50, discountedAmount: 500, writeOffAmount: 0, writeOffVatAmount: 0 },
          ],
        },
      ], p)
    }
    const f = p.filters ?? {}
    const billingType = f.billingType && f.billingType !== "ALL" ? f.billingType : ""
    const params: Record<string, unknown> = {
      page: p.page,
      pageNumber: p.page,
      pageSize: p.pageSize,
      sortBy: p.sortBy || "matterTitle",
      sortDirection: p.sortDir || "desc",
      flatten: true,
      fromDate: f.fromDate ?? "",
      toDate: f.toDate ?? "",
      matterId: f.matterId ?? "",
      procuredBy: f.procuredBy ?? f.userId ?? "",
      leadConvertedFromDate: f.leadConvertedFromDate ?? "",
      leadConvertedToDate: f.leadConvertedToDate ?? "",
      leadSource: f.leadSource ? decodeURIComponent(String(f.leadSource)) : "",
      billingType,
    }
    if (f.clientId) params.clientId = f.clientId
    const res = await axiosClient.get("/api/report/procuredby/revenue", { params })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** LMS Excel download — GET `/reports/export-excel/fee-earners/download-lead-value-report`. */
  async requestLeadValueExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Excel downloaded successfully"
    }
    const billingType = filters.billingType && filters.billingType !== "ALL" ? filters.billingType : ""
    const params: Record<string, unknown> = {
      flatten: true,
      sortBy: filters.sortBy || "matterTitle",
      sortDirection: filters.sortDirection || filters.sortDir || "desc",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      matterId: filters.matterId ?? "",
      procuredBy: filters.procuredBy ?? filters.userId ?? "",
      leadConvertedFromDate: filters.leadConvertedFromDate ?? "",
      leadConvertedToDate: filters.leadConvertedToDate ?? "",
      leadSource: filters.leadSource ? decodeURIComponent(String(filters.leadSource)) : "",
      billingType,
    }
    if (filters.clientId) params.clientId = filters.clientId
    const res = await axiosClient.get("/api/reports/export-excel/fee-earners/download-lead-value-report", { params })
    const fileUrl = typeof res.data?.data === "string" ? res.data.data : undefined
    if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
      const link = document.createElement("a")
      link.href = fileUrl
      link.setAttribute("download", "Lead-Value-Report.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
      return "Excel downloaded successfully"
    }
    return res.data?.Msg ?? res.data?.message ?? fileUrl ?? "Excel export requested."
  },

  async getLeadsReduction(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const rows: Record<string, unknown>[] = [
        {
          id: "lr1",
          nationality: ["UAE"],
          leadType: "COMPANY",
          clientName: "Al Rashid Holdings",
          clientId: "c1",
          title: "260303 — Building Dispute",
          matterId: "m1",
          matterSubject: "Corporate advisory",
          leadName: "Al Rashid Holdings",
          converted: false,
          writeOff: false,
          currentStatus: "Negotiation",
          createdAt: "2026-09-01",
          leadConvertedDate: "",
          leadWriteOffDate: "",
          department: "Corporate",
          natureOfDispute: "Fee reduction on proposed engagement",
          proposedValue: 100000,
          approvedValue: 75000,
          reductionPercentage: 25,
          reductionReason: "Client budget constraints",
          approvedByName: "Sarah Johnson",
          billingType: "Hourly",
        },
      ]
      return pg(rows, p)
    }
    const f = p.filters ?? {}
    const sortBy = p.sortBy === "description" ? "natureOfDispute" : (p.sortBy || "leadName")
    const res = await axiosClient.get("/api/leads/reductions", {
      params: {
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        leadConvertedFromDate: f.leadConvertedFromDate ?? "",
        leadConvertedToDate: f.leadConvertedToDate ?? "",
        leadName: f.leadName ?? "",
        matterBillingType: f.matterBillingType ?? "",
        matterId: f.matterId ?? "",
        status: f.status ?? "",
        reductionThreshold: f.reductionThreshold ?? "",
        page: p.page,
        size: p.pageSize,
        sortBy,
        sortDirection: p.sortDir || "asc",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestLeadsReductionExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/leads/reductions/excel", {
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      leadConvertedFromDate: filters.leadConvertedFromDate ?? "",
      leadConvertedToDate: filters.leadConvertedToDate ?? "",
      leadName: filters.leadName ?? "",
      matterBillingType: filters.matterBillingType ?? "",
      matterId: filters.matterId ?? "",
      status: filters.status ?? "",
      reductionThreshold: filters.reductionThreshold ?? "",
    })
  },

  getMatterRevenueSummary: (p: GridParams) => reportsApi.fetchReport("/api/revenue-allocation/matter-revenue-summary", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "mrs1", matterTitle: "260303", revenue: 45000, sessions: 6, departmentName: "Litigation" },
  ]),

  /** LMS GET `/estimate-hours-by-designation/matter-summary` (page/size + matterId). */
  async getEstimateHoursByDesignation(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "eh1",
          clientId: "c1",
          clientName: "Al Rashid Holdings",
          matterId: "m1",
          matterTitle: "260303",
          lfaNo: "LFA-001",
          projectedHours: 120,
          projectedAmount: 120000,
          totalEstimateAmountWithProfitMargin: 138000,
          actualHours: 96,
          actualAmount: 96000,
          marginCost: 24000,
          marginPercent: 20,
        },
      ], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/estimate-hours-by-designation/matter-summary", {
      params: {
        page: p.page,
        size: p.pageSize,
        matterId: f.matterId ?? "",
      },
    })
    const raw = res.data?.data ?? res.data
    const page = unwrap(raw, p)
    page.content = page.content.map((row, i) => ({
      ...row,
      id: String(row.matterId ?? row.id ?? `eh-${p.page}-${i}`),
    }))
    return page
  },

  requestEstimateHoursByDesignationExcel: (filters: Record<string, unknown> = {}) =>
    excelMsg("/api/reports/export-excel/estimate-hours-by-designation/matter-summary/excel", {
      matterId: filters.matterId ?? "",
    }),

  /** LMS GET `/report/revenue-vs-budget` — fee-earner YTD vs budget. */
  async getRevenueBudget(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([
        {
          id: "rb1",
          _id: "rb1",
          responsiblePersonName: "Sarah Johnson",
          departmentName: "Litigation",
          actualRevenue: 100000,
          totalBudget: 90000,
          variation: 10000,
          variationPercentage: 11.11,
        },
      ], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/revenue-vs-budget", {
      params: {
        departmentId: f.departmentId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        responsiblePersonId: f.responsiblePersonId ?? f.userId ?? "",
        page: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy || "responsiblePersonName",
        sortDirection: p.sortDir || "desc",
      },
    })
    const raw = res.data?.data ?? res.data
    const page = unwrap(raw, p)
    page.content = page.content.map((row, i) => ({
      ...row,
      id: String(row._id ?? row.id ?? `rb-${p.page}-${i}`),
      feId: row._id ?? row.feId ?? row.id,
    }))
    return page
  },

  requestRevenueBudgetExcel: (filters: Record<string, unknown> = {}) =>
    excelMsg("/api/report/revenue-vs-budget/excel", {
      departmentId: filters.departmentId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      responsiblePersonId: filters.responsiblePersonId ?? filters.userId ?? "",
      downloadReport: false,
    }),

  getBillingRateAnalysis: (p: GridParams) => reportsApi.fetchReport("/api/report/fee-earners/revenue/effective-billing-rate", p, f => ({
    responsiblePerson: f.userId ?? "", departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "bra1", userName: "Sarah Johnson", effectiveRate: 950, standardRate: 1000, hours: 40, departmentName: "Litigation" },
  ]),

  getMatterBillingSnapshot: (p: GridParams) => reportsApi.fetchReport("/api/report/matter/all/billing/cached", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "mbs1", matterTitle: "260303", clientName: "Al Rashid", totalBilled: 50000, wip: 5000, status: "Open" },
  ]),

  getMarginErosionCache: (p: GridParams) => reportsApi.fetchReport("/api/report/get/me-report-cache", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "mec1", matterTitle: "260303", userName: "Sarah Johnson", erosionAmount: 2000, erosionPct: 8.5, departmentName: "Litigation" },
  ]),
}
