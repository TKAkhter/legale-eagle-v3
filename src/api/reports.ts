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
}
