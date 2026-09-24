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
  { id: "u1", userName: "Sarah Johnson", totalHours: 42, billableHours: 38, nonBillableHours: 4, utilizationRate: 90.5, billedAmount: 38000 },
  { id: "u2", userName: "Dory Abi Khalil", totalHours: 36, billableHours: 30, nonBillableHours: 6, utilizationRate: 83.3, billedAmount: 36000 },
  { id: "u3", userName: "Mashood Rafi", totalHours: 40, billableHours: 35, nonBillableHours: 5, utilizationRate: 87.5, billedAmount: 42000 },
  { id: "u4", userName: "Ahmad AlKhalil", totalHours: 32, billableHours: 28, nonBillableHours: 4, utilizationRate: 87.5, billedAmount: 33600 },
]

const STATIC_BILLED_FE = [
  { id: "ba1", userName: "Sarah Johnson", departmentName: "Litigation", totalBilled: 85000, totalPaid: 75000, outstanding: 10000 },
  { id: "ba2", userName: "Dory Abi Khalil", departmentName: "Corporate", totalBilled: 62000, totalPaid: 62000, outstanding: 0 },
  { id: "ba3", userName: "Mashood Rafi", departmentName: "Family Law", totalBilled: 28000, totalPaid: 20000, outstanding: 8000 },
]

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
    : []) as Record<string, unknown>[]
  if (Array.isArray(d.content) || typeof d.totalElements === "number") {
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
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

async function excelMsg(path: string, params: Record<string, unknown> = {}, method: "get" | "post" = "get"): Promise<string> {
  if (env.USE_STATIC_DATA) {
    await new Promise(r => setTimeout(r, 250))
    return "Excel will be emailed shortly."
  }
  const res = method === "post"
    ? await axiosClient.post(path, {}, { params })
    : await axiosClient.get(path, { params })
  return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
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

  /** Fee-earner billed amount (nav: Billed Amount) */
  async getBilledAmount(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(STATIC_BILLED_FE as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/fee-earners/billed-amount", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        departmentId: f.departmentId ?? "",
        responsiblePerson: f.userId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestBilledAmountExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/fee-earners-billed-amount-excel", {
      departmentId: filters.departmentId ?? "",
      responsiblePerson: filters.userId ?? "",
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

  async getUtilization(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(STATIC_UTIL as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.post(
      "/api/report/fee-earners/util-report-by-user-status/v2",
      { responsiblePersonId: f.userId ?? f.responsiblePersonId ?? "" },
      {
        params: {
          pageNumber: p.page,
          pageSize: p.pageSize,
          active: f.active ?? "",
          departmentId: f.departmentId ?? "",
          matterId: f.matterId ?? "",
          fromDate: f.fromDate ?? "",
          toDate: f.toDate ?? "",
        },
      },
    )
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestUtilizationExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/fee-earners/util-report-by-user-status/v2", {
      active: filters.active ?? "",
      departmentId: filters.departmentId ?? "",
      matterId: filters.matterId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
      responsiblePersonId: filters.userId ?? "",
    })
  },

  async getActivityHistory(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const q = String(p.filters?.searchText ?? "").toLowerCase()
      const list = (staticActivityFeed as Record<string, unknown>[]).map(a => ({
        ...a,
        actor: a.actor,
        entity: a.entity,
        entityName: a.entityName,
        description: a.description,
        createdAt: a.createdAt,
      }))
      const filtered = q
        ? list.filter(r => `${r.actor} ${r.description} ${r.entityName}`.toLowerCase().includes(q))
        : list
      return pg(filtered, p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/activity/history", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        category: f.category ?? "",
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        responsiblePerson: f.userId ?? f.responsiblePerson ?? "",
        performedBy: f.performedBy ?? "",
        searchText: f.searchText ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestActivityHistoryExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/activity/history", {
      category: filters.category ?? "",
      clientId: filters.clientId ?? "",
      matterId: filters.matterId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
    })
  },

  async getCollections(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(collectionsReport as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/collections", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getMarginErosion(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg(marginErosionReport as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/report/fee-earners/revenue/matter-erosion-activities", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        matterId: f.matterId ?? "",
        clientId: f.clientId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        responsiblePerson: f.userId ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async requestMarginErosionExcel(filters: Record<string, unknown> = {}) {
    return excelMsg("/api/reports/export-excel/fee-earners/download-margin-erosion-report", {
      matterId: filters.matterId ?? "",
      clientId: filters.clientId ?? "",
      fromDate: filters.fromDate ?? "",
      toDate: filters.toDate ?? "",
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
  }), [
    { id: "d1", clientName: "Al Rashid Holdings", matterTitle: "260303", dueAmount: 12000, overdueDays: 45 },
  ]),

  getMattersReport: (p: GridParams) => reportsApi.fetchReport("/api/report/matter/mini/filter/v2", p, f => ({
    clientId: f.clientId ?? "",
    departmentId: f.departmentId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "m1", title: "260303 — Building Dispute", status: "Open", clientName: "Al Rashid Holdings", billingType: "Hourly" },
  ], "post"),

  getTasksReport: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks", p, f => ({
    type: f.eventType ?? "ALL",
    clientId: f.clientId ?? "",
    userId: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "t1", taskName: "Draft memo", taskStatus: "Pending", priority: "High", assignedTo: "Sarah Johnson" },
  ], "post"),

  getHearingsReport: (p: GridParams) => reportsApi.fetchReport("/api/report/hearings/mini/page", p, f => ({
    clientId: f.clientId ?? "",
    matterId: f.matterId ?? "",
    hearingfromDate: f.fromDate ?? "",
    hearingToDate: f.toDate ?? "",
    caseNo: "",
    caseType: "",
  }), [
    { id: "h1", hearingTitle: "CMC", matterTitle: "260303", hearingDate: "2026-09-25", location: "Dubai Courts" },
  ]),

  getProfitLoss: (p: GridParams) => reportsApi.fetchReport("/api/report/fee-earners/revenue/profit-and-loss", p, f => ({
    departmentId: f.departmentId ?? "",
    responsiblePerson: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "pl1", userName: "Sarah Johnson", revenue: 85000, cost: 42000, profit: 43000 },
  ]),

  getAttorneyRevenue: (p: GridParams) => reportsApi.fetchReport("/api/report/fee-earners/revenue/billed", p, f => ({
    departmentId: f.departmentId ?? "",
    responsiblePerson: f.userId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "ar1", userName: "Sarah Johnson", billed: 85000, collected: 75000 },
  ]),

  getReferralReport: (p: GridParams) => reportsApi.fetchReport("/api/report/lfa/referral", p, f => ({
    billingType: f.billingType ?? "",
    clientId: f.clientId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "rf1", referralParty: "Mohammad Ovesh", referralSource: "Internal", amount: 15000 },
  ]),

  getNonConvertedLeads: (p: GridParams) => reportsApi.fetchReport("/api/report/lead/activity-time", p, f => ({
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
    userId: f.userId ?? "",
  }), [
    { id: "nc1", leadName: "Prospect Co", hours: 12, status: "Open" },
  ]),

  getPurgedDiscounted: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/statistics/purged-discounted", p, f => ({
    departmentId: f.departmentId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "pd1", activity: "Research", purgedHours: 2, discountedAmount: 500 },
  ]),

  getCostAnalysis: (p: GridParams) => reportsApi.fetchReport("/api/report/lfa/cost-analysis", p, f => ({
    matterId: f.matterId ?? "",
    lfaId: f.lfaId ?? "",
    billingType: f.billingType ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "ca1", agreementNo: "LFA-001", cost: 25000, billed: 40000, margin: 15000 },
  ]),

  getZohoOutstanding: (p: GridParams) => reportsApi.fetchReport("/api/zoho/outstanding", p, f => ({
    clientId: f.clientId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
  }), [
    { id: "zo1", clientName: "Al Rashid Holdings", outstanding: 8500, zohoInvoiceNo: "INV-ZOHO-1" },
  ], "post"),

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

  getActivitiesReport: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/filter/m/v2", p, f => ({
    clientId: f.clientId ?? "",
    matterId: f.matterId ?? "",
    fromDate: f.fromDate ?? "",
    toDate: f.toDate ?? "",
    userId: f.userId ?? "",
  }), [
    { id: "act1", activityName: "Document Review", matterTitle: "260303", hours: 3.5, userName: "Sarah Johnson" },
  ], "post"),

  getDepositBalance: (p: GridParams) => reportsApi.fetchReport("/api/report/deposit/balance/amount/v2", p, f => ({
    clientId: f.clientId ?? "",
    lfaId: f.lfaId ?? "",
  }), [
    { id: "dep1", clientName: "Al Rashid Holdings", agreementNo: "LFA-001", balance: 5000 },
  ]),

  getUserTimelogEntries: (p: GridParams) => reportsApi.fetchReport("/api/report/activity/statistics/by-person", p, f => ({
    userId: f.userId ?? "", departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "ute1", userName: "Sarah Johnson", totalHours: 42, billableHours: 38, nonBillableHours: 4, departmentName: "Litigation" },
  ]),

  getRatingReport: (p: GridParams) => reportsApi.fetchReport("/api/report/tasks/rating", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "rt1", userName: "Sarah Johnson", averageRating: 4.5, taskCount: 12 },
  ]),

  getPostsReport: (p: GridParams) => reportsApi.fetchReport("/api/leads/get/list", p, f => ({
    type: "People", status: "Converted", page: p.page, pageSize: p.pageSize,
  }), [
    { id: "p1", firstName: "Ali", lastName: "Hassan", companyName: "Prospect Co", status: "Converted" },
  ]),

  getWipAttorney: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners", p, f => ({
    responsiblePerson: f.userId ?? "", departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "", invoiceCreated: false,
  }), [
    { id: "wa1", userName: "Sarah Johnson", matterTitle: "260303", totalHours: 12, totalAmount: 12000, revenueStatus: "DRAFT" },
  ]),

  getWipMatter: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners/by-matter", p, f => ({
    matterId: f.matterId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "wm1", matterTitle: "260303", userName: "Sarah Johnson", totalHours: 12, totalAmount: 12000, revenueStatus: "DRAFT" },
  ]),

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

  getClosedMatters: (p: GridParams) => reportsApi.fetchReport("/api/matter/close/form/search", p, f => ({
    clientId: f.clientId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "cm1", matterTitle: "260280", clientName: "Al Rashid", closedDate: "2026-08-01", closedBy: "Admin", reason: "Settled" },
  ], "post"),

  getFeeEarnerBilled: (p: GridParams) => reportsApi.fetchReport("/api/report/wip-reports/fee-earners", p, f => ({
    responsiblePerson: f.userId ?? "", departmentId: f.departmentId ?? "", matterId: f.matterId ?? "", invoiceCreated: true, fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "feb1", userName: "Sarah Johnson", matterTitle: "260303", totalHours: 10, totalAmount: 10000, departmentName: "Litigation" },
  ]),

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
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "pb1", userName: "Sarah Johnson", revenue: 85000, leadCount: 12, matterCount: 8 },
  ]),

  getLeadValue: (p: GridParams) => reportsApi.fetchReport("/api/report/procuredby/revenue", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "", type: "lead-value",
  }), [
    { id: "lv1", userName: "Sarah Johnson", leadValue: 120000, convertedValue: 80000, leadCount: 15 },
  ]),

  getLeadsReduction: (p: GridParams) => reportsApi.fetchReport("/api/leads/reductions", p, f => ({
    userId: f.userId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "lr1", stage: "Qualification", count: 20, reductionPct: 35, userName: "Sarah Johnson" },
  ]),

  getMatterRevenueSummary: (p: GridParams) => reportsApi.fetchReport("/api/revenue-allocation/matter-revenue-summary", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "mrs1", matterTitle: "260303", revenue: 45000, sessions: 6, departmentName: "Litigation" },
  ]),

  getEstimateHoursByDesignation: (p: GridParams) => reportsApi.fetchReport("/api/report/estimate-hours-by-designation/matter-summary", p, f => ({
    matterId: f.matterId ?? "", departmentId: f.departmentId ?? "",
  }), [
    { id: "eh1", matterTitle: "260303", designation: "Associate", estimatedHours: 40, actualHours: 36 },
  ]),

  getRevenueBudget: (p: GridParams) => reportsApi.fetchReport("/api/report/revenue-vs-budget", p, f => ({
    departmentId: f.departmentId ?? "", fromDate: f.fromDate ?? "", toDate: f.toDate ?? "",
  }), [
    { id: "rb1", departmentName: "Litigation", revenue: 100000, budget: 90000, variance: 10000 },
  ]),

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
