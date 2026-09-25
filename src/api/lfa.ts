import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { lfaItems as staticLfa, lfaDefaults as staticDefaults, lfaApprovals as staticApprovals } from "@/data/static"
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

export const lfaApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const status = String(f.status ?? "Active")
      const billingType = String(f.billingType ?? "")
      const clientId = String(f.clientId ?? "")
      const filtered = (staticLfa as Record<string, unknown>[]).filter(row => {
        const client = row.client as { id?: string } | null
        if (clientId && client?.id !== clientId) return false
        if (billingType && String(row.billingType) !== billingType) return false
        if (status === "Active" && !row.current && String(row.lfaStatus) === "Draft") return false
        return true
      })
      return pageOf(filtered, p)
    }
    const res = await axiosClient.get("/api/lfa/filter/page/v2", {
      params: {
        lfaId: f.lfaId ?? "",
        clientId: f.clientId ?? "",
        matterId: f.matterId ?? "",
        status: f.status ?? "Active",
        pageNumber: p.page,
        pageSize: p.pageSize,
        billingType: f.billingType ?? "",
        referralId: f.referralId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        sortBy: p.sortBy ?? "createdAt",
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getById(lfaId: string) {
    if (env.USE_STATIC_DATA) {
      return (staticLfa as Record<string, unknown>[]).find(l => l.id === lfaId) ?? staticLfa[0]
    }
    const res = await axiosClient.get("/api/lfa/get/full", { params: { lfaId } })
    return res.data?.data ?? res.data
  },

  async getActiveMatters(lfaId: string) {
    if (env.USE_STATIC_DATA) {
      return [{ id: "m1", title: "260303 — Building Dispute" }]
    }
    const res = await axiosClient.get("/api/lfa/active/matter", { params: { lfaId } })
    const d = res.data?.data ?? res.data
    return d?.content ?? (Array.isArray(d) ? d : [])
  },

  async getRates(lfaId: string) {
    if (env.USE_STATIC_DATA) {
      const row = (staticLfa as Record<string, unknown>[]).find(l => l.id === lfaId)
      return (row?.rates as unknown[]) ?? []
    }
    const res = await axiosClient.get("/api/lfa/get/item", { params: { lfaId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  /** Seed designation rates for new Hourly LFAs (LMS /util/get/hourly/rate). */
  async getDefaultHourlyRates() {
    if (env.USE_STATIC_DATA) {
      return [
        { designation: { id: "d1", name: "Partner" }, rate: 800, defaultRate: 800 },
        { designation: { id: "d2", name: "Associate" }, rate: 450, defaultRate: 450 },
        { designation: { id: "d3", name: "Paralegal" }, rate: 200, defaultRate: 200 },
      ]
    }
    const res = await axiosClient.get("/api/util/get/hourly/rate")
    return res.data?.data ?? res.data ?? []
  },

  /** Seed session rates (LMS /util/get/session/rate). */
  async getDefaultSessionRates() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "s1", typeName: "Court Hearing", rate: 1500 },
        { id: "s2", typeName: "Consultation", rate: 800 },
      ]
    }
    const res = await axiosClient.get("/api/util/get/session/rate")
    return res.data?.data ?? res.data ?? []
  },

  /** Active LFA title masters (LMS /util/list/lfa/title). */
  async getLfaTitles() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "t1", name: "Standard Retainer", status: true },
        { id: "t2", name: "Litigation Agreement", status: true },
      ]
    }
    const res = await axiosClient.get("/api/util/list/lfa/title")
    const list = res.data?.data ?? res.data ?? []
    return (Array.isArray(list) ? list : []).filter((t: { status?: boolean }) => t.status !== false)
  },

  /** Fixed breakdown categories (LMS /util/list/break/down). */
  async getBreakdownTypes() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "bd1", name: "Filing Fees", status: true },
        { id: "bd2", name: "Professional Fees", status: true },
      ]
    }
    const res = await axiosClient.get("/api/util/list/break/down")
    const list = res.data?.data ?? res.data ?? []
    return (Array.isArray(list) ? list : []).filter((b: { status?: boolean }) => b.status !== false)
  },

  /** Referral partners (LMS /util/list/refer/client). */
  async getReferralPartners() {
    if (env.USE_STATIC_DATA) {
      return [{ id: "rp1", name: "Partner Firm LLC" }]
    }
    const res = await axiosClient.get("/api/util/list/refer/client")
    return res.data?.data ?? res.data ?? []
  },

  /** Upload LFA PDF/doc (LMS POST /util/fileUpload). */
  async uploadAgreementFile(file: File, clientUuid: string) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return { url: "https://example.com/lfa.pdf", name: file.name }
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folderName", "Matter")
    formData.append("uuid", clientUuid)
    const res = await axiosClient.post("/api/util/fileUpload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    const data = res.data?.data ?? res.data
    return Array.isArray(data) ? data[0] : data
  },

  async getDefaults(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      return pageOf(staticDefaults as unknown as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/lfa/get/default")
    const list = res.data?.data ?? res.data ?? []
    const arr = Array.isArray(list) ? list : [list].filter(Boolean)
    return pageOf(arr as Record<string, unknown>[], p)
  },

  async activateDefault(lfaId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Default LFA activated." }
    const res = await axiosClient.get("/api/lfa/make/default", { params: { lfaId } })
    return res.data?.Msg ?? res.data?.message ?? "Default LFA activated."
  },

  async getByClient(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const filtered = (staticLfa as Record<string, unknown>[]).filter(l => {
        const c = l.client as { id?: string } | null
        return !clientId || c?.id === clientId
      })
      return pageOf(filtered, p)
    }
    const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId } })
    const list = res.data?.data ?? res.data ?? []
    const arr = Array.isArray(list) ? list : [list].filter(Boolean)
    return pageOf(arr as Record<string, unknown>[], p)
  },

  /**
   * Approver queue (OLD `/LFAs-approval` → `GET /lfa/approval/list`).
   * Distinct from pending queue below.
   */
  async getApprovalList(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf(staticApprovals as unknown as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/lfa/approval/list")
    const list = res.data?.data ?? res.data ?? []
    const arr = (Array.isArray(list) ? list : []) as Record<string, unknown>[]
    return pageOf(arr, p)
  },

  /**
   * Pending LFAs awaiting send/approve (OLD `/pending/approval` → `GET /lfa/pending/approval`).
   */
  async getPendingApproval(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf(staticApprovals as unknown as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/lfa/pending/approval", {
      params: {
        clientId: f.clientId ?? "",
        billingType: f.billingType ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    const d = (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
    // LMS shape: { lfaList, recordSize }
    if (Array.isArray(d.lfaList)) {
      const content = d.lfaList as Record<string, unknown>[]
      const total = Number(d.recordSize ?? content.length)
      return {
        content,
        totalElements: total,
        totalPages: Math.ceil(total / p.pageSize) || 0,
        number: p.page,
        size: p.pageSize,
        first: p.page === 0,
        last: (p.page + 1) * p.pageSize >= total,
        empty: content.length === 0,
      }
    }
    return unwrapPage(d, p)
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "lfa-new" } }
    const res = await axiosClient.post("/api/lfa/add", data)
    return res.data?.data ?? res.data
  },

  async update(lfaId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/lfa/edit", data, { params: { lfaId } })
  },

  async approve(lfaId: string, status: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return `LFA ${status}.` }
    const res = await axiosClient.patch(`/api/lfa/approve/${lfaId}/${status}`)
    return res.data?.Msg ?? res.data?.message ?? `LFA ${status}.`
  },

  async sendForApproval(lfaId: string, approvePerson: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Sent for approval." }
    const res = await axiosClient.post("/api/lfa/send/approval", { approvePerson }, { params: { lfaId } })
    return res.data?.Msg ?? res.data?.message ?? "Sent for approval."
  },

  async amend(oldLfaId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "lfa-amend" } }
    const res = await axiosClient.post("/api/lfa/amendment", data, { params: { oldLfaId } })
    return res.data?.data ?? res.data
  },

  async partialAmend(lfaId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: lfaId } }
    const res = await axiosClient.post("/api/lfa/partial/amendment", data, { params: { lfaId } })
    return res.data?.data ?? res.data
  },

  async setInactive(lfaId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "LFA status updated." }
    const res = await axiosClient.put(`/api/lfa/inactive/${lfaId}`)
    return res.data?.Msg ?? res.data?.message ?? "LFA status updated."
  },

  async getGroupCounts() {
    if (env.USE_STATIC_DATA) {
      return [
        { billingType: "Hourly", totalCount: 1 },
        { billingType: "Session", totalCount: 0 },
        { billingType: "Fixed", totalCount: 2 },
      ]
    }
    const res = await axiosClient.get("/api/lfa/group/count")
    return res.data?.data ?? res.data ?? []
  },

  async requestExcel(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Excel will be emailed shortly." }
    const res = await axiosClient.get("/api/reports/export-excel/lfa/filter/page", {
      params: {
        lfaId: filters.lfaId ?? "",
        clientId: filters.clientId ?? "",
        matterId: filters.matterId ?? "",
        status: filters.status ?? "Active",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
        referralId: filters.referralId ?? "",
        billingType: filters.billingType ?? "",
      },
    })
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
  },
}
