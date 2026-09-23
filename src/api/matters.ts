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
  async close(matterId: string, payload: { closeDate?: string; closeReason?: string; closingNote?: string } | string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 500)); return }
    const body = typeof payload === "string"
      ? { matterId, reason: payload }
      : {
          matterId,
          closeDate: payload.closeDate,
          reason: payload.closeReason ?? "",
          note: payload.closingNote ?? "",
        }
    await axiosClient.post("/api/matter/close", body, { params: { matterId } })
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
    const estimates = Array.isArray(content[0]?.designationEstimates)
      ? (content[0].designationEstimates as Record<string, unknown>[])
      : content
    const mapped = estimates.map((row, index) => {
      const hours = Number(row.hours ?? row.projectedHours ?? 0)
      const used = Number(row.actualHours ?? row.usedHours ?? 0)
      const balance = Number(row.balance ?? row.balanceHours ?? (hours - used))
      return {
        id: String(row.id ?? row.designationId ?? index),
        designation: row.designationName ?? row.designation ?? "—",
        projectedHours: hours,
        usedHours: used,
        balanceHours: balance,
        usagePercent: hours > 0 ? Math.round((used / hours) * 100) : 0,
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

}
