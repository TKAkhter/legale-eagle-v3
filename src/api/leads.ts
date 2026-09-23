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
  if (statusGroup === "Converted" && lead.status !== "CONVERTED") return false
  if ((statusGroup === "Written Off" || statusGroup === "Writeoff") && !["WRITE_OFF", "Writeoff"].includes(lead.status)) return false
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

  async convert(leadId: string, matter: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/convert", { leadId, matter })
  },

  async addFollowup(leadId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/add/followup", { leadId, ...data, files: [] })
  },

  async getFollowups(leadId: string) {
    if (env.USE_STATIC_DATA) return staticFollowups
    const res = await axiosClient.get("/api/leads/get/followup", { params: { leadId } })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async writeOff(leadId: string, reason?: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/leads/get/lead/writeoff", { leadId, reason })
  },

  async reopen(leadId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Lead reopened." }
    const res = await axiosClient.put(`/api/leads/reopen/${leadId}`)
    return res.data?.Msg ?? res.data?.message ?? "Lead reopened."
  },

  async changeStatus(leadId: string, status: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Status updated." }
    const res = await axiosClient.post("/api/leads/status/change", null, { params: { leadId, status } })
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
    if (env.USE_STATIC_DATA) {
      const { matterTimelogs } = await import("@/data/static")
      return pageOf(matterTimelogs as unknown as Record<string, unknown>[], p)
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
    return unwrapPage(res.data?.data ?? res.data, p)
  },
}
