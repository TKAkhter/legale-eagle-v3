import { transformMatter, type RawMatter } from '@/transformers/matter.transformer'
import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { matters as staticMatters } from "@/data/static"
import type { GridParams, PageResponse } from "@/types/common.types"

/** Default list statuses from the old matters screen. */
export const DEFAULT_MATTER_STATUSES = ["OPEN", "RE_OPEN"]

export interface MatterListQuery {
  params: Record<string, string | number>
  body: {
    attorney: string[]
    procuredByIds: string[]
    status: string[]
  }
}

function asString(value: unknown): string {
  return value == null ? "" : String(value)
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item)).filter(Boolean)
}

/** Query string + body used by the old `/report/matter/mini/filter/page/v2` call. */
export function buildMatterListQuery(p: GridParams): MatterListQuery {
  const filters = p.filters ?? {}
  const status = filters.status === undefined
    ? DEFAULT_MATTER_STATUSES
    : asStringArray(filters.status)

  return {
    params: {
      client: asString(filters.clientId),
      practiceArea: asString(filters.practiceArea),
      matterId: asString(filters.matterId),
      status: "",
      scope: asString(filters.scope),
      billingType: "",
      lfa: "",
      toDate: "",
      fromDate: "",
      departmentName: "",
      matterCloseFromDate: "",
      matterCloseToDate: "",
      lastActivityFromDate: "",
      lastActivityToDate: "",
      partyOpposing: asString(filters.partyOpposing),
      pageNumber: p.page,
      pageSize: p.pageSize,
    },
    body: {
      attorney: asStringArray(filters.attorneyIds),
      procuredByIds: asStringArray(filters.procuredByIds),
      status,
    },
  }
}

function matchesList(raw: RawMatter, query: MatterListQuery): boolean {
  const matter = transformMatter(raw)
  const { params, body } = query
  const clientId = String(params.client ?? "")
  const matterId = String(params.matterId ?? "")
  const practiceArea = String(params.practiceArea ?? "")
  const scope = String(params.scope ?? "").toLowerCase()
  const party = String(params.partyOpposing ?? "").toLowerCase()

  if (clientId && matter.clientId !== clientId && raw.clientMini?.id !== clientId) return false
  if (matterId && matter.matterId !== matterId && matter.id !== matterId) return false
  if (practiceArea && matter.practiceArea !== practiceArea) return false
  if (scope && !`${matter.description} ${matter.matterSubject}`.toLowerCase().includes(scope)) return false
  if (party && !matter.opposingParties.some(name => name.toLowerCase().includes(party))) return false
  if (body.attorney.length && !body.attorney.some(id => matter.attorneyIds.includes(id))) return false
  if (body.procuredByIds.length && !body.procuredByIds.some(id => matter.procuredByIds.includes(id))) return false
  if (body.status.length && !body.status.includes(matter.status)) return false
  return true
}

function pageOf<T extends Record<string, unknown>>(rows: T[], p: GridParams): PageResponse<T> {
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

async function staticPage(key: string, p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
  const data = await import("@/data/static")
  const rows = ((data as Record<string, unknown>)[key] ?? []) as Record<string, unknown>[]
  await new Promise(r => setTimeout(r, 150))
  return pageOf(rows, p)
}

export const mattersApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const query = buildMatterListQuery(p)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const filtered = (staticMatters as RawMatter[])
        .filter(row => matchesList(row, query))
        .map(row => transformMatter(row))
      return pageOf(filtered as unknown as Record<string, unknown>[], p)
    }
    const res = await axiosClient.post(
      "/api/report/matter/mini/filter/page/v2",
      query.body,
      { params: query.params },
    )
    const d = res.data?.data ?? res.data
    const content = ((d.content ?? []) as RawMatter[]).map(raw => transformMatter(raw))
    return {
      content: content as unknown as Record<string, unknown>[],
      totalElements: d.totalElements ?? 0,
      totalPages: d.totalPages ?? 0,
      number: d.number ?? p.page,
      size: d.size ?? p.pageSize,
      first: d.first ?? p.page === 0,
      last: d.last ?? true,
      empty: d.empty ?? content.length === 0,
    }
  },

  /** Old matters list emails an Excel file instead of downloading it in the browser. */
  async requestExcel(filters: Record<string, unknown> = {}): Promise<string> {
    const query = buildMatterListQuery({ page: 0, pageSize: 10, filters })
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Excel export has been emailed."
    }
    const exportParams = { ...query.params }
    delete exportParams.pageNumber
    delete exportParams.pageSize
    const res = await axiosClient.post(
      "/api/reports/export-excel/matter/excel",
      { attorney: query.body.attorney, status: query.body.status },
      { params: exportParams },
    )
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "m-new" } }
    const res = await axiosClient.post("/api/matter/add", data)
    return res.data?.data ?? res.data
  },
  async getById(matterId: string) {
    if (env.USE_STATIC_DATA) {
      const { matterDetail } = await import('@/data/static')
      return matterDetail
    }
    const unwrapMatter = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return raw
      const obj = raw as Record<string, unknown>
      // Live BE: { matters: {...}, lfaWithLFAItem: ... }
      if (obj.matters && typeof obj.matters === "object") {
        const matter = obj.matters as Record<string, unknown>
        const lfaWrap = obj.lfaWithLFAItem as Record<string, unknown> | undefined
        const lfaInner = (lfaWrap?.lfa as Record<string, unknown> | undefined) ?? lfaWrap
        return {
          ...matter,
          // Old LMS overview reads matter.client; some payloads only have clientMini.
          client: matter.client ?? matter.clientMini ?? null,
          lfa: lfaInner
            ? {
                ...lfaInner,
                lfaNo: lfaInner.agreementNo ?? lfaInner.lfaNo ?? matter.lfaNo,
                lfaType: lfaInner.lfaType ?? lfaInner.billingType ?? matter.lfaType,
                agreementNo: lfaInner.agreementNo,
              }
            : {
                lfaNo: matter.lfaNo,
                lfaType: matter.lfaType,
              },
          emailUniqueId: matter.emailUniqueId ?? matter.emailUnique,
          applicableLaws: matter.applicableLawName ?? matter.applicableLaw ?? matter.applicableLaws,
          capAmount: matter.capAmount,
        }
      }
      if (obj.matter && typeof obj.matter === "object") {
        const matter = obj.matter as Record<string, unknown>
        return {
          ...matter,
          client: matter.client ?? matter.clientMini ?? obj.client ?? null,
          lfa: obj.lfa ?? matter.lfa,
        }
      }
      const flat = obj as Record<string, unknown>
      if (!flat.client && flat.clientMini) {
        return { ...flat, client: flat.clientMini }
      }
      return raw
    }
    try {
      const res = await axiosClient.get("/api/matter/get/with/lfa/details", { params: { matterId } })
      return unwrapMatter(res.data?.data ?? res.data)
    } catch {
      const res = await axiosClient.post('/api/matter/get/by/id', null, { params: { matterId } })
      return unwrapMatter(res.data?.data ?? res.data)
    }
  },
  async close(matterId: string, payload: Record<string, unknown> | string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 500)); return }
    const body = typeof payload === "string"
      ? { matterId, reason: payload, note: payload }
      : { matterId, ...payload, note: payload.note ?? payload.closingNote ?? "", reason: payload.reason ?? payload.closeReason ?? "" }
    const res = await axiosClient.post("/api/matter/close", body, { params: { matterId } })
    if (String(res.data?.code) === "403" || (Number(res.data?.code) >= 400)) {
      throw new Error(res.data?.Msg ?? "Failed to close matter")
    }
  },
  async reopen(matterId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Matter reopened."
    }
    const res = await axiosClient.put("/api/matter/re-open", null, { params: { matterId } })
    const data = res.data ?? {}
    if (String(data.code) === "403") {
      throw new Error(data.Msg ?? "You do not have permission to reopen this matter.")
    }
    return data.Msg ?? "Matter reopened."
  },

  async search(query: string): Promise<Record<string, unknown>[]> {
    if (env.USE_STATIC_DATA) {
      const { matters } = await import("@/data/static")
      const q = query.toLowerCase()
      return (matters as Record<string, unknown>[]).filter(m => String(m.title ?? "").toLowerCase().includes(q)).slice(0, 10)
    }
    const r = await axiosClient.get("/api/matter/get/short-info", { params: { searchText: query } })
    const d = r.data?.data ?? r.data
    return d.content ?? d ?? []
  },

  async getTimelogs(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterTimelogs", p)
    // Old LMS: /report/activity/filter/m/v3 with billable=true, sessionType=false, filterWithSow=true
    const res = await axiosClient.post(`/api/report/activity/filter/m/v3`, null, {
      params: {
        activityType: "",
        matterId,
        clientId: "",
        userId: "",
        lfaId: "",
        billable: true,
        sessionType: false,
        departmentId: "",
        fromDate: "",
        toDate: "",
        pageNumber: p.page,
        pageSize: p.pageSize,
        filterWithSow: true,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getHearings(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterHearings", p)
    const res = await axiosClient.get("/api/hearing/get/v3", {
      params: { matterId, isPaginated: true, page: p.page, size: p.pageSize, filterWithSow: true },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getTasks(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterTasks", p)
    const res = await axiosClient.get("/api/task/get/all-task/v2", {
      params: {
        eventType: "MATTER",
        eventTypeId: matterId,
        filterWithSow: true,
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getInvoices(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterInvoices", p)
    // Old MatterInvoicesTab passes invoiceStatus=All and empty sibling filters.
    const res = await axiosClient.post("/api/invoice/filter/all/v2", {}, {
      params: {
        matterId,
        filterWithSow: true,
        invoiceStatus: "All",
        billingType: "",
        clientId: "",
        departmentId: "",
        fromDate: "",
        toDate: "",
        year: "",
        invoiceNo: "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getLogs(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterLogs", p)
    // Old LMS: /activity/log/get?clientId=&matterId=...&taskId=&leadId=&hearingId= (raw array)
    const res = await axiosClient.get("/api/activity/log/get", {
      params: { clientId: "", matterId, taskId: "", leadId: "", hearingId: "" },
    })
    const list = (Array.isArray(res.data?.data) ? res.data.data
      : Array.isArray(res.data) ? res.data
      : []) as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getNotes(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterNotesList", p)
    const res = await axiosClient.post("/api/notes/get/v2", null, {
      params: {
        noteRelatedTo: "MATTER",
        getNoteRelatedToId: matterId,
        isPaginated: true,
        pageNumber: p.page,
        pageSize: p.pageSize,
        filterWithSow: true,
      },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async addNote(matterId: string, payload: { title: string; content: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return { id: `note-${Date.now()}`, ...payload }
    }
    // Old AddNote posts textContent (not content) with noteType=Text.
    const res = await axiosClient.post("/api/notes/add", {
      noteRelatedTo: "MATTER",
      noteRelatedToId: matterId,
      getNoteRelatedToId: matterId,
      noteType: "Text",
      title: payload.title,
      textContent: payload.content,
      voiceContent: "",
    })
    return res.data?.data ?? res.data
  },

  async getFinanceContacts(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterFinanceContacts", p)
    const res = await axiosClient.get("/api/matter/finance-contacts/list/v2", {
      params: { matterId, pageNumber: p.page, pageSize: p.pageSize, isPaginated: true },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getProjectedHours(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterProjectedHours", p)
    const res = await axiosClient.get("/api/estimate-hours-by-designation/matter-estimate/status/v2", {
      params: { matterId, page: p.page, size: p.pageSize, filterWithSow: true },
    })
    const data = res.data?.data ?? res.data
    const content = (Array.isArray(data?.content) ? data.content
      : Array.isArray(data) ? data
      : []) as Record<string, unknown>[]
    // Old LMS flattens content[0].designationEstimates into table rows.
    const carrier = content[0] as Record<string, unknown> | undefined
    const estimates = Array.isArray(carrier?.designationEstimates)
      ? (carrier!.designationEstimates as Record<string, unknown>[])
      : content
    const mapped = estimates.map((row, index) => {
      const hours = Number(row.hours ?? row.projectedHours ?? 0)
      const used = Number(row.actualHours ?? row.usedHours ?? 0)
      const balance = Number(row.balance ?? row.balanceHours ?? (hours - used))
      return {
        id: String(row.id ?? row.designationId ?? index),
        designationId: String(row.designationId ?? ""),
        designation: String(row.designationName ?? row.designation ?? "—"),
        projectedHours: hours,
        usedHours: used,
        balanceHours: balance,
        usagePercent: hours > 0 ? Math.round((used / hours) * 100) : 0,
        templateId: String(
          carrier?.templateId ?? carrier?.templateID ?? (carrier?.template as { id?: string } | undefined)?.id ?? "",
        ),
        templateName: String(
          carrier?.templateName ?? (carrier?.template as { templateName?: string } | undefined)?.templateName ?? "",
        ),
        ...row,
      }
    })
    return {
      content: mapped,
      totalElements: Number(data?.totalElements ?? mapped.length),
      totalPages: Number(data?.totalPages ?? 1),
      number: p.page,
      size: p.pageSize,
      first: p.page === 0,
      last: true,
      empty: mapped.length === 0,
    }
  },

  async getEstimateHourTemplates() {
    if (env.USE_STATIC_DATA) {
      return [{ id: "et1", templateName: "Litigation Default", name: "Litigation Default" }]
    }
    const res = await axiosClient.get("/api/estimate-hours-by-designation/get/template", {
      params: { pageNumber: 0, pageSize: 50, isActiveFilter: true },
    })
    const d = res.data?.data ?? res.data ?? {}
    return (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
  },

  async getEstimateHourTemplateById(id: string) {
    if (env.USE_STATIC_DATA) {
      return {
        id,
        designationDetails: [
          { designationId: "d1", designationName: "Partner", hours: 20 },
          { designationId: "d2", designationName: "Associate", hours: 40 },
        ],
      }
    }
    const res = await axiosClient.get(`/api/estimate-hours-by-designation/get/template/${id}`)
    return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
  },

  async saveProjectedHours(payload: {
    matterId: string
    designationEstimates: { designationId: string; designationName?: string; hours: number }[]
    update?: boolean
    templateId?: string
    applyFromTemplate?: boolean
  }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    if (payload.update) {
      const res = await axiosClient.put("/api/estimate-hours-by-designation/update", {
        matterId: payload.matterId,
        designationEstimates: payload.designationEstimates,
      })
      if (String(res.data?.code) === "403") throw new Error(res.data?.Msg ?? "Failed to update projected hours")
      return
    }
    const body: Record<string, unknown> = {
      applyFromTemplate: Boolean(payload.applyFromTemplate),
      designationEstimates: payload.designationEstimates,
      matterId: payload.matterId,
    }
    if (payload.templateId) body.templateId = payload.templateId
    const res = await axiosClient.post("/api/estimate-hours-by-designation/add", body)
    if (String(res.data?.code) === "403") throw new Error(res.data?.Msg ?? "Failed to add projected hours")
  },

  async getHourlyRates(matterId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "hr1", userId: { id: "u1", firstName: "Sarah", lastName: "Johnson" }, rate: 1200 },
        { id: "hr2", userId: { id: "u3", firstName: "Priya", lastName: "Sharma" }, rate: 800 },
      ]
    }
    const res = await axiosClient.get("/api/matter/get/hourly/rate", { params: { matterId } })
    const data = res.data?.data ?? res.data ?? []
    return (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  },

  async updateHourlyRatesBulk(
    matterId: string,
    HourlyRateMatter: { userId: string; rate: number; hourlyRateMatterId?: string }[],
  ) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    const res = await axiosClient.post(
      "/api/matter/update/hourly/rate/bulk",
      { HourlyRateMatter },
      { params: { matterId } },
    )
    if (String(res.data?.code) === "403") throw new Error(res.data?.Msg ?? "Failed to update hourly rates")
  },

  async getSnapshots(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterSnapshots", p)
    // Old SnapShots: /matter/get/snap/v1 → response.data.data (array of snapshot events)
    const res = await axiosClient.get("/api/matter/get/snap/v1", {
      params: { id: matterId, snapType: "MATTER", filterWithSow: true },
    })
    const raw = res.data?.data ?? res.data
    const list = (Array.isArray(raw) ? raw
      : Array.isArray(raw?.content) ? raw.content
      : []) as Record<string, unknown>[]
    const mapped = list.map((row, index) => {
      const editedBy = row.editedBy as { firstName?: string; lastName?: string } | undefined
      const createdBy = editedBy
        ? `${editedBy.firstName ?? ""} ${editedBy.lastName ?? ""}`.trim()
        : String(row.createdBy ?? "")
      const ts = row.timeStamp
      const createdAt = typeof ts === "number"
        ? new Date(ts * 1000).toISOString()
        : String(row.createdAt ?? row.timeStamp ?? "")
      return {
        id: String(row.id ?? index),
        createdAt,
        createdBy,
        title: String(row.title ?? row.matterSubject ?? row.firstName ?? "Snapshot"),
        billingType: String(row.billingType ?? "—"),
        status: String(row.status ?? (row.active ? "Active" : "")),
        practiceArea: typeof row.practiceArea === "object"
          ? String((row.practiceArea as { name?: string })?.name ?? "")
          : String(row.practiceArea ?? "—"),
        ...row,
      }
    })
    return pageOf(mapped, p)
  },

  async getChecklist(matterId: string) {
    if (env.USE_STATIC_DATA) {
      const { matterChecklist } = await import("@/data/static")
      return matterChecklist
    }
    const res = await axiosClient.get("/api/matter/get/matter/checklist", { params: { matterId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async updateChecklistItem(matterId: string, item: { id: string; checked: boolean; title?: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      return item
    }
    const res = await axiosClient.post("/api/matter/update/matter/checklist", {
      matterId,
      id: item.id,
      checked: item.checked,
      title: item.title,
    })
    return res.data?.data ?? res.data
  },

  async getMails(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) return staticPage("matterMails", p)
    const res = await axiosClient.get("/api/emails/matter/getmini/v2", {
      params: { matterId, filterWithSow: true, pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getEmailById(emailId: string) {
    if (env.USE_STATIC_DATA) {
      return {
        emailId,
        subject: "Re: Matter correspondence",
        from: "counsel@example.com",
        to: ["team@demo.local"],
        cc: [],
        body: "<p>Static matter email body.</p>",
        date: new Date().toISOString(),
        webLink: "",
      }
    }
    const res = await axiosClient.get("/api/emails/get", { params: { emailId } })
    return res.data?.data ?? res.data ?? {}
  },

  /** Create/link matter mailbox folder (LMS POST /matter/email/attach). */
  async attachMailbox(matterId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Attached successfully."
    }
    const res = await axiosClient.post("/api/matter/email/attach", null, {
      params: { matterId },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Attached successfully.")
  },

  async enableEnforcement(matterId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Enforcement activated."
    }
    const res = await axiosClient.put(`/api/matter/active/enforcement/${matterId}`)
    return String(res.data?.Msg ?? res.data?.message ?? "Enforcement activated.")
  },

  async activateContingent(lfaId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Contingent activated."
    }
    const res = await axiosClient.get("/api/lfa/active/contingent", { params: { lfaId } })
    return String(res.data?.Msg ?? res.data?.message ?? "Contingent activated.")
  },

  async activateNonContingent(lfaId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Non-contingent activated."
    }
    const res = await axiosClient.get("/api/lfa/active/non/contingent", { params: { lfaId } })
    return String(res.data?.Msg ?? res.data?.message ?? "Non-contingent activated.")
  },

  async activateSuccessRate(lfaId: string, matterId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Success rate activated."
    }
    const res = await axiosClient.get("/api/lfa/active/success/rate", {
      params: { lfaId, matterId },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Success rate activated.")
  },

  async getStatusTimeline(matterId: string) {
    if (env.USE_STATIC_DATA) {
      const { matterStatusTimeline } = await import("@/data/static")
      return matterStatusTimeline
    }
    const res = await axiosClient.get("/api/matter/get/matter/status/timeline", { params: { matterId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async getTeam(matterId: string) {
    if (env.USE_STATIC_DATA) {
      const { matterTeam } = await import("@/data/static")
      return matterTeam
    }
    const res = await axiosClient.get("/api/matter-team/get/by-matter", { params: { matterId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  /** Full matter-team record (id + users) for edit. */
  async getMatterTeamRecord(matterId: string): Promise<{
    id: string
    matterId: string
    matterTitle: string
    description: string
    teamTemplateId: string
    users: { userId: string; teamRoleId: string; userName?: string; roleName?: string }[]
  } | null> {
    if (env.USE_STATIC_DATA) {
      return {
        id: "mt1",
        matterId,
        matterTitle: "",
        description: "",
        teamTemplateId: "",
        users: [
          { userId: "u1", teamRoleId: "tr1", userName: "Sarah Johnson", roleName: "Handling Work" },
        ],
      }
    }
    const res = await axiosClient.get("/api/matter-team/get/by-matter", { params: { matterId } })
    const raw = res.data?.data ?? res.data
    const record = Array.isArray(raw) ? raw[0] : raw
    if (!record || typeof record !== "object") return null
    const usersRaw = (record as { users?: unknown[]; members?: unknown[] }).users
      ?? (record as { members?: unknown[] }).members
      ?? []
    const users = (Array.isArray(usersRaw) ? usersRaw : []).map((raw) => {
      const m = raw as Record<string, unknown>
      const user = (m.user ?? {}) as Record<string, unknown>
      const role = (m.teamRole ?? m.role ?? {}) as Record<string, unknown>
      return {
        userId: String(m.userId ?? user.id ?? ""),
        teamRoleId: String(m.teamRoleId ?? m.roleId ?? role.id ?? ""),
        userName: String(
          m.userName
          ?? `${user.firstName ?? m.firstName ?? ""} ${user.lastName ?? m.lastName ?? ""}`.trim()
          ?? "",
        ),
        roleName: String(m.roleName ?? m.teamRoleDescription ?? role.description ?? role.name ?? ""),
      }
    }).filter(u => u.userId && u.teamRoleId)
    return {
      id: String((record as { id?: string; _id?: string }).id ?? (record as { _id?: string })._id ?? ""),
      matterId: String((record as { matterId?: string }).matterId ?? matterId),
      matterTitle: String((record as { matterTitle?: string; title?: string }).matterTitle ?? (record as { title?: string }).title ?? ""),
      description: String((record as { description?: string }).description ?? ""),
      teamTemplateId: String(
        (record as { teamTemplateId?: string; templateId?: string }).teamTemplateId
        ?? (record as { templateId?: string }).templateId
        ?? ((record as { teamTemplate?: { id?: string } }).teamTemplate?.id ?? ""),
      ),
      users,
    }
  },

  async getTeamRoles() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "tr1", description: "Handling Work", name: "Handling Work" },
        { id: "tr2", description: "Supervisor", name: "Supervisor" },
        { id: "tr3", description: "Associate", name: "Associate" },
      ]
    }
    const res = await axiosClient.get("/api/team-role/get/all", { params: { page: 0, pageSize: 1000 } })
    const d = res.data?.data ?? res.data ?? []
    const list = Array.isArray(d) ? d : Array.isArray(d.content) ? d.content : []
    return (list as Record<string, unknown>[]).filter(r => {
      if (typeof r.active === "boolean") return r.active
      if (typeof r.status === "boolean") return r.status
      return true
    })
  },

  async getTeamTemplates() {
    if (env.USE_STATIC_DATA) {
      return [{ id: "tt1", name: "Litigation Default" }]
    }
    const res = await axiosClient.get("/api/team-template/get/all", {
      params: { page: 0, pageSize: 1000, sortBy: "name", sortDirection: "asc" },
    })
    const d = res.data?.data ?? res.data ?? []
    const list = Array.isArray(d) ? d : Array.isArray(d.content) ? d.content : []
    return (list as Record<string, unknown>[]).map(t => ({
      ...t,
      id: String(t.id ?? t._id ?? t.templateId ?? ""),
    }))
  },

  async getTeamTemplateById(id: string) {
    if (env.USE_STATIC_DATA) {
      return {
        id,
        users: [{ userId: "u1", teamRoleId: "tr1" }],
      }
    }
    const res = await axiosClient.get("/api/team-template/get", { params: { id } })
    return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
  },

  async saveMatterTeam(payload: {
    matterId: string
    matterTitle?: string
    description?: string
    users: { userId: string; teamRoleId: string }[]
    id?: string
    teamTemplateId?: string
  }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    const body: Record<string, unknown> = {
      matterId: payload.matterId,
      matterTitle: payload.matterTitle ?? "",
      description: payload.description ?? "",
      users: payload.users.filter(u => u.userId && u.teamRoleId),
    }
    if (payload.id) body.id = payload.id
    if (payload.teamTemplateId) body.teamTemplateId = payload.teamTemplateId
    const path = payload.id ? "/api/matter-team/update" : "/api/matter-team/add"
    const res = await axiosClient.post(path, body)
    if (String(res.data?.code) === "403" || res.data?.success === false) {
      throw new Error(res.data?.Msg ?? "Failed to save matter team")
    }
  },

  async getConflictChecks(matterId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "mcc1", partyName: "Opposing LLC", matchType: "Matter", status: "Cleared", details: "No conflict" },
      ], p)
    }
    const res = await axiosClient.get("/api/conflict/check/matter/search", { params: { matterId } })
    const list = (Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getTransactions(matterId: string, bankAccountId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "mtx1", transactionDate: "2026-08-01", description: "Retainer deposit", debit: 0, credit: 25000, balance: 25000 },
        { id: "mtx2", transactionDate: "2026-08-20", description: "Invoice payment", debit: 5000, credit: 0, balance: 20000 },
      ], p)
    }
    const res = await axiosClient.get("/api/account/transaction/by/matter", {
      params: { matterId, bankAccountId, pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getStopWorkingReasons(): Promise<{ id: string; name: string }[]> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "sw1", name: "Awaiting client instructions" },
        { id: "sw2", name: "Court adjournment" },
        { id: "sw3", name: "Conflict review" },
      ]
    }
    const res = await axiosClient.get("/api/matter-stop-working/get")
    const list = res.data?.data ?? res.data ?? []
    return (Array.isArray(list) ? list : [])
      .filter((r: { status?: boolean }) => r.status !== false)
      .map((r: { id?: string; name?: string }) => ({ id: String(r.id), name: String(r.name ?? r.id) }))
  },

  async updateStopWorking(
    matterId: string,
    payload: { stopWorkingEnabled: boolean; stopWorkingReasonId?: string; sendEmail?: boolean },
  ) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    const res = await axiosClient.post("/api/matter/update-stop-working", {
      matterId,
      ...payload,
    })
    if (String(res.data?.code) === "403" || res.data?.success === false) {
      throw new Error(res.data?.Msg ?? "Failed to update stop working")
    }
  },

  /** LMS PATCH /matter/update/estimate — estimate must be 0 or ≥ 500. */
  async updateEstimate(matterId: string, estimate: number): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Estimate updated successfully."
    }
    const res = await axiosClient.patch("/api/matter/update/estimate", { matterId, estimate })
    if (String(res.data?.code) === "403" || res.data?.success === false) {
      throw new Error(res.data?.Msg ?? "You are not allowed to update the estimate.")
    }
    return res.data?.Msg ?? res.data?.message ?? "Estimate updated successfully."
  },

}
