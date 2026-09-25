import { transformLead, type Lead, type RawLead } from "@/transformers/lead.transformer"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { leads as staticLeads, leadDetail as staticLeadDetail, leadFollowups as staticFollowups } from "@/data/static"
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
    : []) as RawLead[]
  const mapped = content.map(transformLead) as unknown as Record<string, unknown>[]
  if (Array.isArray(d.content) || typeof d.totalElements === "number") {
    return {
      content: mapped,
      totalElements: Number(d.totalElements ?? mapped.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(mapped.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: Boolean(d.empty ?? mapped.length === 0),
    }
  }
  return pageOf(mapped, p)
}

/** Generic page unwrap — do NOT run lead transformers on unrelated list payloads. */
function unwrapGenericPage(data: unknown, p: GridParams): PageResponse<Record<string, unknown>> {
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

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function buildLeadFilter(p: GridParams) {
  const f = p.filters ?? {}
  // Old LMS enums: type=People|Company|All, status=Open|Converted|Writeoff|All
  let type = String(f.type ?? f.leadType ?? "All")
  if (type === "Individual" || type === "PERSON" || type === "People") type = "People"
  else if (type === "Company" || type === "COMPANY") type = "Company"
  else if (type !== "All") type = "All"

  let status = String(f.statusGroup ?? f.status ?? "All")
  if (status === "Write_Off" || status === "Written Off" || status === "WriteOff" || status === "Written_Off") {
    status = "Writeoff"
  } else if (status === "Repeated") {
    status = "Repeated"
  }

  return {
    params: {
      firstName: String(f.searchText ?? f.firstName ?? ""),
      type,
      status,
      pa: String(f.practiceArea ?? ""),
      sourceType: String(f.sourceType ?? ""),
      fromDate: String(f.fromDate ?? ""),
      toDate: String(f.toDate ?? ""),
      pageSize: p.pageSize,
      pageNumber: p.page,
      sortBy: p.sortBy ?? "createdAt",
      sortDirection: p.sortDir ?? "desc",
      currentStatus: String(f.currentStatus ?? ""),
      department: String(f.department ?? ""),
      lawyer: String(f.lawyer ?? ""),
    },
    body: {
      departmentIds: asStrings(f.departmentIds),
      attorneyIds: asStrings(f.attorneyIds),
      procuredByIds: asStrings(f.procuredByIds),
    },
  }
}

function matchesStatic(lead: Lead, p: GridParams): boolean {
  const f = p.filters ?? {}
  const q = String(f.searchText ?? "").toLowerCase()
  const type = String(f.type ?? f.leadType ?? "All")
  const statusGroup = String(f.statusGroup ?? f.status ?? "All")
  const currentStatus = String(f.currentStatus ?? "")
  if (q && !`${lead.name} ${lead.companyName} ${lead.email}`.toLowerCase().includes(q)) return false
  if (type === "Individual" || type === "People") {
    if (lead.leadType === "COMPANY" || lead.leadType === "Company") return false
  }
  if (type === "Company") {
    if (lead.leadType !== "COMPANY" && lead.leadType !== "Company") return false
  }
  if (currentStatus && lead.status !== currentStatus) return false
  if (statusGroup === "Open" && ["CONVERTED", "WRITE_OFF", "Writeoff", "CLOSED"].includes(lead.status)) return false
  if (statusGroup === "Converted" && lead.status !== "CONVERTED" && !lead.converted) return false
  if ((statusGroup === "Written Off" || statusGroup === "Writeoff") && !lead.writeOff && !["WRITE_OFF", "Writeoff"].includes(lead.status)) return false
  if (statusGroup === "Repeated" && !lead.repeated) return false
  return true
}

function enrichStatic(raw: Record<string, unknown>): RawLead {
  return {
    ...raw,
    attorneyName: undefined,
    lawyer: (raw.lawyer as RawLead["lawyer"]) ?? undefined,
    conflictCheckStatus: String(raw.conflictCheckStatus ?? "Pending"),
    lastStatusUpdatedDate: String(raw.updatedAt ?? raw.createdAt ?? ""),
    dispute: String(raw.description ?? ""),
    addedByName: "Admin",
    partyOpposing: [],
  }
}

export const leadsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const query = buildLeadFilter(p)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const rows = staticLeads
        .map(l => transformLead(enrichStatic(l as unknown as Record<string, unknown>)))
        .filter(l => matchesStatic(l, p))
      return pageOf(rows as unknown as Record<string, unknown>[], p)
    }
    const res = await axiosClient.post("/api/leads/list/filter", query.body, { params: query.params })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getMy(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const query = buildLeadFilter(p)
    if (env.USE_STATIC_DATA) return this.getAll(p)
    const res = await axiosClient.post("/api/leads/my/filter", query.body, { params: query.params })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getProcuredByMe(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const query = buildLeadFilter(p)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      return pageOf([
        { id: "l1", name: "Al Rashid Holdings", matterNo: "260303", billedAmount: 15000, creditAmount: 0, netAmount: 15000, status: "CONVERTED" },
      ] as Record<string, unknown>[], p)
    }
    const res = await axiosClient.post("/api/leads/procuredByMe/filter/v2", query.body, { params: query.params })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getById(leadId: string) {
    if (env.USE_STATIC_DATA) {
      if (staticLeadDetail.id === leadId) return transformLead(staticLeadDetail as RawLead)
      const found = staticLeads.find(l => l.id === leadId)
      return found ? transformLead(enrichStatic(found as unknown as Record<string, unknown>)) : transformLead(staticLeadDetail as RawLead)
    }
    const res = await axiosClient.get("/api/leads/get/by/id", { params: { leadId } })
    const payload = (res.data?.data ?? res.data) as Record<string, unknown>
    // Old LMS uses response.data.data as the lead. Some wraps nest under `leads`/`lead`.
    const nested = (payload?.leads ?? payload?.lead) as RawLead | undefined
    const raw = (nested && typeof nested === "object"
      ? { ...payload, ...nested }
      : payload) as RawLead
    return transformLead(raw)
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "l-new" } }
    const res = await axiosClient.post("/api/leads/add", data)
    return res.data?.data ?? res.data
  },

  async update(leadId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/update/lead", data, { params: { leadId } })
  },

  async convert(leadId: string, data: { clientId: string; lfaId: string }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/convert", { leadId, clientId: data.clientId, lfaId: data.lfaId })
  },

  async convertRepeated(leadId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    const res = await axiosClient.get("/api/leads/convert/repeated", { params: { leadId } })
    return res.data?.data ?? res.data
  },

  async addFollowup(leadId: string, data: FormData | Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    if (data instanceof FormData) {
      await axiosClient.post("/api/leads/add/followup", data, {
        params: { leadId },
        headers: { "Content-Type": "multipart/form-data" },
      })
      return
    }
    await axiosClient.post("/api/leads/add/followup", data, { params: { leadId } })
  },

  async getFollowups(leadId: string) {
    if (env.USE_STATIC_DATA) return staticFollowups
    const res = await axiosClient.get("/api/leads/get/followup", { params: { leadId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async writeOff(leadId: string, writeOffReason?: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return "Lead written off." }
    const res = await axiosClient.post(
      "/api/leads/get/lead/writeoff",
      { writeOffReason: writeOffReason ?? "" },
      { params: { leadId } },
    )
    return res.data?.Msg ?? res.data?.message ?? "Lead written off."
  },

  async reopen(leadId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Lead reopened." }
    const res = await axiosClient.put(`/api/leads/reopen/${leadId}`)
    return res.data?.Msg ?? res.data?.message ?? "Lead reopened."
  },

  async changeStatus(
    leadId: string,
    status: string,
    body?: { stageComments?: string; assignTo?: string; department?: string },
  ): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Status updated." }
    const res = await axiosClient.post(
      "/api/leads/status/change",
      body ?? { stageComments: "" },
      { params: { leadId, status } },
    )
    return res.data?.Msg ?? res.data?.message ?? "Status updated."
  },

  async getStatusTimeline(leadId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "st1", status: "NEW", changedAt: "2025-01-15T09:00:00", changedBy: "Sarah Johnson", note: "Lead created" },
        { id: "st2", status: "FOLLOW_UP", changedAt: "2025-01-20T14:00:00", changedBy: "Sarah Johnson", note: "Proposal sent" },
      ]
    }
    const res = await axiosClient.get("/api/leads/get/lead/status/timeline", { params: { leadId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async getWriteOffReasons(): Promise<{ id: string; name: string }[]> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "r1", name: "No response" },
        { id: "r2", name: "Budget" },
        { id: "r3", name: "Chose another firm" },
        { id: "r4", name: "Other" },
      ]
    }
    const res = await axiosClient.get("/api/util/list/write-off/reason")
    return res.data?.data ?? res.data ?? []
  },

  async getTimelogs(leadId: string, p: GridParams) {
    const withActivityIds = (page: PageResponse<Record<string, unknown>>) => ({
      ...page,
      content: page.content.map(row => {
        const activityId = String(row.activityId ?? row.id ?? "")
        return { ...row, id: activityId || String(row.id ?? ""), activityId }
      }),
    })
    if (env.USE_STATIC_DATA) {
      const { matterTimelogs } = await import("@/data/static")
      return withActivityIds(pageOf(matterTimelogs as unknown as Record<string, unknown>[], p))
    }
    // Old LMS: activityRelatedTo=LEAD + leadId on /report/activity/filter/m/v2
    const res = await axiosClient.post("/api/report/activity/filter/m/v2", null, {
      params: {
        activityRelatedTo: "LEAD",
        userId: "",
        fromDate: "",
        toDate: "",
        leadId,
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return withActivityIds(unwrapGenericPage(res.data?.data ?? res.data, p))
  },

  async getMeetings(leadId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "m1", title: "Initial consultation", meetingDate: "2026-09-10T10:00:00", status: "Completed", location: "Office" },
        { id: "m2", title: "Proposal review", meetingDate: "2026-09-18T14:00:00", status: "Scheduled", location: "Zoom" },
      ]
    }
    const res = await axiosClient.get("/api/meeting/get/by/lead", { params: { leadId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async createMeeting(leadId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.post("/api/meeting/add", { ...data, leadId })
  },

  /**
   * OLD LMS: GET /meeting/change/status?meetingId=&meetingStatus=
   * Values: SCHEDULE | COMPLETED | CANCEL
   */
  async changeMeetingStatus(meetingId: string, meetingStatus: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "Changed successfully."
    }
    const res = await axiosClient.get("/api/meeting/change/status", {
      params: { meetingId, meetingStatus },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Changed successfully.")
  },

  /**
   * OLD LMS: POST /meeting/mom/upload?meetingId=&content=
   * multipart body: files[]
   */
  async uploadMeetingMom(meetingId: string, content: string, files: File[]): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Uploaded successfully."
    }
    const formData = new FormData()
    for (const f of files) formData.append("files", f)
    const res = await axiosClient.post("/api/meeting/mom/upload", formData, {
      params: { meetingId, content },
      headers: { "Content-Type": "multipart/form-data" },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Uploaded successfully.")
  },

  /**
   * OLD LMS: GET /meeting/get/mom?meetingId=
   * Returns rows with textContent, createdAt, documents[]
   */
  async getMeetingMom(meetingId: string): Promise<Record<string, unknown>[]> {
    if (env.USE_STATIC_DATA) {
      return [{
        id: "mom1",
        textContent: "Discussion summary",
        createdAt: "2026-09-10T11:00:00",
        documents: ["https://example.com/mom.pdf"],
      }]
    }
    const res = await axiosClient.get("/api/meeting/get/mom", { params: { meetingId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  /**
   * OLD LMS: POST /leads/status/upload?leadId=&status=&note=&docType=
   * multipart body: files[]
   */
  async uploadStatusDoc(opts: {
    leadId: string
    status: string
    docType: string
    note?: string
    files: File[]
  }): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Uploaded successfully."
    }
    const formData = new FormData()
    for (const f of opts.files) formData.append("files", f)
    const res = await axiosClient.post("/api/leads/status/upload", formData, {
      params: {
        leadId: opts.leadId,
        status: opts.status,
        note: opts.note ?? "",
        docType: opts.docType,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Uploaded successfully.")
  },

  /**
   * OLD LMS: POST /qrcode/generateQRCode — returns base64 PNG in Msg.
   */
  async generateQRCode(codeText: string, width = 200, height = 200): Promise<string> {
    if (env.USE_STATIC_DATA) {
      // 1x1 transparent PNG
      return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    }
    const res = await axiosClient.post("/api/qrcode/generateQRCode", { codeText, width, height })
    return String(res.data?.Msg ?? res.data?.data ?? "")
  },

  /** OLD LMS: GET /util/list/doc/type */
  async getDocTypes(): Promise<{ id: string; type?: string; name?: string }[]> {
    if (env.USE_STATIC_DATA) {
      return [{ id: "dt1", type: "ID" }, { id: "dt2", type: "Contract" }, { id: "dt3", type: "Other" }]
    }
    const res = await axiosClient.get("/api/util/list/doc/type")
    const list = res.data?.data ?? res.data ?? []
    return Array.isArray(list) ? list : []
  },

  /**
   * Status master with ids — OLD `/leads/get/status` returns `{ id, statusName }[]`.
   * Used by status-doc upload (API expects status id).
   */
  async getLeadStatusOptions(): Promise<{ id: string; statusName: string }[]> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "s1", statusName: "NEW" },
        { id: "s2", statusName: "FOLLOW_UP" },
        { id: "s3", statusName: "PROPOSAL" },
        { id: "s4", statusName: "CONVERTED" },
      ]
    }
    const res = await axiosClient.get("/api/leads/get/status")
    const list = res.data?.data ?? res.data ?? []
    if (!Array.isArray(list)) return []
    return list.map((s: unknown) => {
      if (typeof s === "string") return { id: s, statusName: s }
      const o = s as { id?: string | number; statusName?: string; name?: string; status?: string }
      const statusName = String(o.statusName ?? o.name ?? o.status ?? o.id ?? "")
      return { id: String(o.id ?? statusName), statusName }
    }).filter(s => s.id && s.statusName)
  },

  /**
   * LMS GET /conflict/check/lead/search — returns main conflict id + conflict_log rows.
   * Shape mirrors matter conflict: data.id + (data.response || data).conflict_log[]
   */
  async getConflictCheckDetail(leadId: string): Promise<{
    mainConflictId: string
    overallStatus: string
    logs: Record<string, unknown>[]
  }> {
    if (env.USE_STATIC_DATA) {
      return {
        mainConflictId: "lc1",
        overallStatus: "Pending",
        logs: [{
          id: "cc1",
          mainConflictId: "lc1",
          partyName: "Al Rashid Holdings",
          matchType: "Client",
          status: "Pending",
          details: "Potential name match",
          approvedStatus: false,
        }],
      }
    }
    const res = await axiosClient.get("/api/conflict/check/lead/search", { params: { leadId } })
    const data = (res.data?.data ?? res.data) as Record<string, unknown> | Record<string, unknown>[] | null
    if (!data) return { mainConflictId: "", overallStatus: "", logs: [] }
    if (Array.isArray(data)) {
      return {
        mainConflictId: String((data[0] as { mainConflictId?: string })?.mainConflictId ?? ""),
        overallStatus: "",
        logs: data as Record<string, unknown>[],
      }
    }
    const mainConflictId = String(data.id ?? "")
    const responseData = (data.response ?? data) as Record<string, unknown>
    const rawLogs = (Array.isArray(responseData.conflict_log)
      ? responseData.conflict_log
      : Array.isArray(data.conflict_log)
        ? data.conflict_log
        : []) as Record<string, unknown>[]
    const overallStatus = String(responseData.overall_status ?? data.overall_status ?? "")
    const logs = rawLogs.map(log => {
      const approved = log.approvedStatus === true
      return {
        ...log,
        id: String(log.id ?? ""),
        mainConflictId,
        partyName: String(
          log.source_opposing_party
          ?? log.matchedName
          ?? log.partyName
          ?? log.name
          ?? "—",
        ),
        matchType: String(log.matchType ?? log.matched_entity_type ?? log.type ?? "—"),
        status: approved
          ? "Cleared"
          : String(log.colour ?? log.status ?? (overallStatus || "Pending")),
        details: String(log.reason ?? log.details ?? "—"),
        approvedStatus: approved,
        approvedByName: log.approvedByName != null ? String(log.approvedByName) : "",
        approvedAt: log.approvedAt != null ? String(log.approvedAt) : "",
      }
    })
    return { mainConflictId, overallStatus, logs }
  },

  async getConflictChecks(leadId: string, p: GridParams) {
    const detail = await leadsApi.getConflictCheckDetail(leadId)
    return pageOf(detail.logs, p)
  },

  /** LMS POST /conflict/lead/approve/v1 — Clear / Approve one or more conflict_log rows. */
  async approveConflict(mainConflictId: string, conflictLogIds: string[]): Promise<string> {
    const ids = [...new Set(conflictLogIds.filter(Boolean))]
    if (!mainConflictId || !ids.length) throw new Error("Missing conflict ID or conflict log ID")
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return ids.length === 1 ? "Conflict approved successfully" : `${ids.length} conflicts approved successfully`
    }
    const res = await axiosClient.post("/api/conflict/lead/approve/v1", {
      id: mainConflictId,
      partyApprovals: ids.map(id => ({ approvedStatus: true, id })),
    })
    if (String(res.data?.code) === "403" || res.data?.success === false) {
      throw new Error(res.data?.Msg ?? "Failed to approve conflict")
    }
    return String(
      res.data?.Msg
      ?? res.data?.message
      ?? (ids.length === 1 ? "Conflict approved successfully" : `${ids.length} conflicts approved successfully`),
    )
  },

  /** LMS POST /conflict/lead/approve-all/{mainConflictId} */
  async approveAllConflicts(mainConflictId: string): Promise<string> {
    if (!mainConflictId) throw new Error("Missing conflict ID")
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return "All conflicts approved successfully"
    }
    const res = await axiosClient.post(`/api/conflict/lead/approve-all/${mainConflictId}`)
    if (String(res.data?.code) === "403" || res.data?.success === false) {
      throw new Error(res.data?.Msg ?? "Failed to approve all conflicts")
    }
    return String(res.data?.Msg ?? res.data?.message ?? "All conflicts approved successfully")
  },

  async assignAttorney(leadId: string, lawyerId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Attorney assigned." }
    const res = await axiosClient.post("/api/leads/assign/attorney", null, { params: { leadId, lawyerId } })
    return res.data?.Msg ?? res.data?.message ?? "Attorney assigned."
  },

  async getLeadStatuses(): Promise<string[]> {
    if (env.USE_STATIC_DATA) {
      return ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
    }
    try {
      const res = await axiosClient.get("/api/leads/get/status")
      const list = res.data?.data ?? res.data ?? []
      if (Array.isArray(list) && list.length) {
        return list.map((s: unknown) => {
          if (typeof s === "string") return s
          const o = s as { name?: string; status?: string; statusName?: string; currentStatus?: string }
          return String(o.statusName ?? o.name ?? o.status ?? o.currentStatus ?? "")
        }).filter(Boolean)
      }
    } catch { /* fall through */ }
    return ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
  },

  async getActivityLogs(leadId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "log1", action: "STATUS_CHANGE", details: "NEW → FOLLOW_UP", userName: "Sarah Johnson", createdAt: "2026-09-01T10:00:00" },
        { id: "log2", action: "UPDATE", details: "Attorney assigned", userName: "Admin", createdAt: "2026-09-02T11:00:00" },
      ], p)
    }
    // OLD LMS: GET /activity/log/get?leadId=
    const res = await axiosClient.get("/api/activity/log/get", {
      params: {
        leadId,
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrapGenericPage(res.data?.data ?? res.data, p)
  },

  async getReductions(leadId: string) {
    if (env.USE_STATIC_DATA) {
      return { proposedValue: 25000, approvedValue: 20000, approvedBy: "", reductionReason: "" }
    }
    const res = await axiosClient.get(`/api/leads/reductions/${leadId}`)
    return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>
  },

  async saveReductions(payload: {
    leadId: string
    proposedValue: number
    approvedValue?: number | null
    approvedBy?: string | null
    reductionReason?: string
  }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/reductions/save", payload)
  },

  async completeConflict(leadId: string, status = "No_Conflict") {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.post("/api/leads/complete/conflict", null, { params: { leadId, status } })
  },

  async getFeeEarnerSummary(leadId: string) {
    if (env.USE_STATIC_DATA) {
      return [{ feeEarner: "Sarah Johnson", hours: 4.5, amount: 5400 }]
    }
    const res = await axiosClient.get(`/api/leads/${leadId}/fee-earner-summary`)
    const d = res.data?.data ?? res.data ?? []
    return Array.isArray(d) ? d : []
  },

  /**
   * OLD LMS: POST /activity/attach/to/matter/v2?matterId=&Billable=&RevenueAllocated=
   * Body: `{ activities: activityId[] }` — attach lead time logs to a matter after convert.
   */
  async attachActivitiesToMatter(opts: {
    matterId: string
    activities: string[]
    billable?: boolean
    revenueAllocated?: boolean
  }): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Time log entries attached to matter."
    }
    const res = await axiosClient.post(
      "/api/activity/attach/to/matter/v2",
      { activities: opts.activities },
      {
        params: {
          matterId: opts.matterId,
          Billable: opts.billable ?? true,
          RevenueAllocated: opts.revenueAllocated ?? true,
        },
      },
    )
    return String(res.data?.Msg ?? res.data?.message ?? "Time log entries attached to matter.")
  },
}
