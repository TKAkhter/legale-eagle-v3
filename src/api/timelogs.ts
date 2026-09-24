import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { timelogs as staticTimelogs } from "@/data/static"
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

function unwrapPage(data: unknown, p: GridParams): PageResponse<Record<string, unknown>> {
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
  return pageOf(content, p)
}

function filterStatic(status?: string) {
  const list = staticTimelogs as Record<string, unknown>[]
  if (!status) return list
  return list.filter(t => String(t.revenueStatus) === status)
}

export type ApproveItem = {
  activityApprovalId: string
  revenueStatus: string
  rejectedReason?: string
}

export const timelogsApi = {
  /** Non-hourly billable queue (Generate Draft) */
  async getBillable(p: GridParams) {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(filterStatic("BILLABLE"), p)
    }
    const res = await axiosClient.get("/api/activity/get/non-hourly/billable", {
      params: {
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        agreementId: f.agreementId ?? f.lfaId ?? "",
        lfaBillingType: f.lfaBillingType ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  /** Draft queue (pre-approval) */
  async getDrafts(p: GridParams) {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(filterStatic("DRAFT"), p)
    }
    const res = await axiosClient.get("/api/activity/get/non-hourly/draft", {
      params: {
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        agreementId: f.agreementId ?? f.lfaId ?? "",
        lfaBillingType: f.lfaBillingType ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  /** Attorney / user approval queue */
  async getForApprovalByUser(p: GridParams) {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(filterStatic("PRE_APPROVAL"), p)
    }
    const res = await axiosClient.get("/api/activity/for-approval/by-user/v2", {
      params: {
        matterId: f.matterId ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
        hod: f.hod ?? "",
        sortBy: p.sortBy ?? "entryDate",
        sortDirection: p.sortDir ?? "desc",
        userId: f.userId ?? "",
        revenueStatus: f.revenueStatus ?? "",
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  /** HOD pending approval list */
  async getPendingApproval(p: GridParams) {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      return pageOf(filterStatic("PRE_APPROVAL"), p)
    }
    const res = await axiosClient.get("/api/activity/for-approval", {
      params: {
        hod: f.hod ?? "",
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        lfaId: f.lfaId ?? "",
        lfaBillingType: f.lfaBillingType ?? "",
        startDate: f.fromDate ?? f.startDate ?? "",
        endDate: f.toDate ?? f.endDate ?? "",
        responsiblePerson: f.userId ?? f.responsiblePerson ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getApproved(p: GridParams) {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      return pageOf(filterStatic("APPROVED"), p)
    }
    const res = await axiosClient.get("/api/activity/approved-activities", {
      params: {
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        responsiblePersonId: f.userId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        page: p.page,
        size: p.pageSize,
        sortBy: p.sortBy ?? "entryDate",
        sortDirection: p.sortDir ?? "desc",
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  /** Report-style activity list */
  async getReport(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(staticTimelogs as unknown as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.post("/api/report/activity/filter/m/v3", {}, {
      params: {
        activityType: "",
        pageNumber: p.page,
        pageSize: p.pageSize,
        sortBy: p.sortBy ?? "entryDate",
        sortDirection: p.sortDir ?? "desc",
        userId: f.userId ?? "",
        matterId: f.matterId ?? "",
        clientId: f.clientId ?? "",
        lfaId: "",
        billable: "",
        sessionType: false,
        departmentId: "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getById(activityId: string) {
    if (env.USE_STATIC_DATA) {
      return (staticTimelogs as Record<string, unknown>[]).find(t => t.id === activityId) ?? staticTimelogs[0]
    }
    const res = await axiosClient.get("/api/activity/get/by/id", { params: { activityId } })
    return res.data?.data ?? res.data
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "act-new" } }
    const res = await axiosClient.post("/api/activity/add/v2", data)
    return res.data?.data ?? res.data
  },

  async edit(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return data }
    const res = await axiosClient.post("/api/activity/edit/v2", data)
    return res.data?.data ?? res.data
  },

  async markDraft(activityIds: string[]): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Marked as draft." }
    const res = await axiosClient.post("/api/activity/mark/draft/v2", { activityIds })
    return res.data?.Msg ?? res.data?.message ?? "Marked as draft."
  },

  async undoDraft(activityIds: string[]): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Draft undone." }
    const res = await axiosClient.post("/api/activity/mark/un-draft", { activityIds })
    return res.data?.Msg ?? res.data?.message ?? "Draft undone."
  },

  async sendForApproval(activityIds: string[], actingHodUserId?: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Sent for approval." }
    const res = await axiosClient.post(
      "/api/activity/send/for/approval/to-attorney/v2",
      { activityIds },
      { params: actingHodUserId ? { actingHodUserId } : undefined },
    )
    return res.data?.Msg ?? res.data?.message ?? "Sent for approval."
  },

  async approve(items: ApproveItem[]): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Activities approved." }
    const res = await axiosClient.post("/api/activity/approve", items)
    return res.data?.Msg ?? res.data?.message ?? "Activities approved."
  },

  async approveByApprovals(items: ApproveItem[]): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Activities approved." }
    const res = await axiosClient.post("/api/activity/approve/by-activity-approvals", items)
    return res.data?.Msg ?? res.data?.message ?? "Activities approved."
  },

  async purge(activityId: string, body: { hours?: number; minutes?: number; billedHours?: number; billedMinutes?: number }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Purged." }
    const res = await axiosClient.post("/api/activity/purge/v2", body, { params: { activityId } })
    return res.data?.Msg ?? res.data?.message ?? "Purged."
  },

  async discount(activityId: string, body: { hours?: number; minutes?: number; billedHours?: number; billedMinutes?: number }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Discounted." }
    const res = await axiosClient.post("/api/activity/discount/v2", body, { params: { activityId } })
    return res.data?.Msg ?? res.data?.message ?? "Discounted."
  },

  async purgeForInvoice(invoiceId: string, activityId: string, body: { billedHours: number; billedMinutes: number }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Purged." }
    const res = await axiosClient.post("/api/activity/purge", body, { params: { invoiceId, activityId } })
    return res.data?.Msg ?? res.data?.message ?? "Purged."
  },

  async discountForInvoice(invoiceId: string, activityId: string, body: { billedHours: number; billedMinutes: number }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Discounted." }
    const res = await axiosClient.post("/api/activity/discount", body, { params: { invoiceId, activityId } })
    return res.data?.Msg ?? res.data?.message ?? "Discounted."
  },

  async getByInvoice(invoiceId: string, attorneyId?: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "a1", activity: "Legal research", hours: 4, minutes: 0, billing: 4000, note: "Research" },
        { id: "a2", activity: "Drafting", hours: 6, minutes: 0, billing: 8000, note: "Draft reply" },
      ]
    }
    const res = await axiosClient.get("/api/activity/get/by/invoice/all", {
      params: { invoiceId, attorneyId: attorneyId ?? "" },
    })
    const data = res.data?.data ?? res.data ?? []
    return Array.isArray(data) ? data : []
  },

  async getStopwatchInfo(stopwatchId?: string) {
    if (env.USE_STATIC_DATA) return { activityTimerStatus: "Idle" }
    const res = await axiosClient.get("/api/activity/stopwatch/info", {
      params: stopwatchId ? { stopwatchId } : undefined,
    })
    return res.data?.data ?? res.data
  },

  async requestPendingExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Excel will be emailed shortly." }
    const res = await axiosClient.get("/api/activity/for-approval/excel", { params: filters })
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
  },

  async requestApprovedExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Excel will be emailed shortly." }
    const res = await axiosClient.get("/api/activity/approved-activities/excel", { params: filters })
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
  },

  /** @deprecated use queue-specific getters */
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    return this.getForApprovalByUser(p)
  },
}
