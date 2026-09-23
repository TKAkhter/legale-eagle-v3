import { transformClient, type Client, type RawClient } from "@/transformers/client.transformer"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { clients as staticClients, clientDetail as staticClientDetail } from "@/data/static"
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

function unwrapList(data: unknown): RawClient[] {
  if (Array.isArray(data)) return data as RawClient[]
  const d = (data ?? {}) as { content?: RawClient[]; data?: RawClient[] }
  if (Array.isArray(d.content)) return d.content
  if (Array.isArray(d.data)) return d.data
  return []
}

/** Server-paginated page → PageResponse (do NOT re-slice with pageOf). */
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

function matchesSearch(client: Client, searchText: string): boolean {
  if (!searchText) return true
  const haystack = [
    client.clientExternalId,
    client.name,
    client.companyName,
    client.firstName,
    client.lastName,
    client.email,
    ...client.emails,
    client.phone,
    ...client.phones,
    client.address,
    ...client.nationality,
    client.status,
  ].join(" ").toLowerCase()
  return haystack.includes(searchText)
}

function statusFilter(clients: Client[], status: string): Client[] {
  if (status === "Active") return clients.filter(c => c.status !== "CLOSE")
  if (status === "Inactive") return clients.filter(c => c.status === "CLOSE")
  return clients
}

function staticAsRaw(): RawClient[] {
  return staticClients.map(c => ({
    ...c,
    clientId: c.id,
    clientExternalId: `CL-${c.id}`,
    status: c.active ? "OPEN" : "CLOSE",
    emails: c.email ? [{ emailId: c.email, primary: true }] : [],
    phones: c.phone ? [{ phoneNo: c.phone, primary: true }] : [],
    nationality: c.nationality ? [c.nationality] : [],
    address: typeof c === "object" && "address" in c ? String((c as { address?: string }).address ?? "") : "",
    lfaCount: 1,
    openMatter: Number((c as { openMatter?: number }).openMatter ?? 1),
    closeMatter: Number((c as { closedMatter?: number }).closedMatter ?? 0),
  }))
}

export const clientsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const searchText = String(p.filters?.searchText ?? "").toLowerCase()
    const status = String(p.filters?.status ?? "Active")

    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      let rows = staticAsRaw().map(transformClient)
      rows = statusFilter(rows, status).filter(c => matchesSearch(c, searchText))
      return pageOf(rows as unknown as Record<string, unknown>[], p)
    }

    const res = await axiosClient.get("/api/client/mini/list")
    let rows = unwrapList(res.data?.data ?? res.data).map(transformClient)
    rows = statusFilter(rows, status).filter(c => matchesSearch(c, searchText))
    return pageOf(rows as unknown as Record<string, unknown>[], p)
  },

  async getFavourites(): Promise<string[]> {
    if (env.USE_STATIC_DATA) return ["c1"]
    const res = await axiosClient.get("/api/fav/client/my")
    const data = res.data?.data ?? res.data ?? []
    if (!Array.isArray(data)) return []
    return data.map((item: { clientId?: string; id?: string }) => String(item.clientId ?? item.id ?? "")).filter(Boolean)
  },

  async toggleFavourite(clientId: string, makeFav: boolean): Promise<void> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return
    }
    await axiosClient.post("/api/fav/client/mark", { clientId, makeFav })
  },

  async requestExcel(): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Client Excel export has been emailed."
    }
    const res = await axiosClient.get("/api/reports/export-excel/client-excel")
    return res.data?.Msg ?? res.data?.message ?? "Excel export requested."
  },

  async getById(clientId: string) {
    if (env.USE_STATIC_DATA) {
      if (staticClientDetail.id === clientId) return transformClient(staticClientDetail as RawClient)
      const found = staticAsRaw().find(c => c.id === clientId || c.clientId === clientId)
      return found ? transformClient(found) : transformClient(staticClientDetail as RawClient)
    }
    const res = await axiosClient.get(`/api/client/get/by/company/${clientId}`)
    const payload = (res.data?.data ?? res.data) as Record<string, unknown>
    // Prefer nested client entity when present (mirrors lead/matter unwraps).
    const nested = (payload?.client ?? payload?.clients) as RawClient | undefined
    const raw = (nested && typeof nested === "object"
      ? { ...payload, ...nested }
      : payload) as RawClient
    return transformClient(raw)
  },

  async search(query: string) {
    if (env.USE_STATIC_DATA) {
      const q = query.toLowerCase()
      return staticClients
        .filter(c => `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(q))
        .map(c => ({ id: c.id, companyName: c.companyName, firstName: c.firstName, lastName: c.lastName }))
    }
    const res = await axiosClient.get("/api/client/get/short-info", {
      params: { clientName: query, pageNumber: 0, pageSize: 50 },
    })
    const { unwrapAxiosList } = await import("@lib/utils/unwrap")
    return unwrapAxiosList(res.data)
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "c-new" } }
    const res = await axiosClient.post("/api/client/add", data)
    return res.data?.data ?? res.data
  },

  async update(clientId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/client/edit", { clientId, ...data })
  },

  async open(clientId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Client activated." }
    const res = await axiosClient.put(`/api/client/open/${clientId}`)
    return res.data?.Msg ?? res.data?.message ?? "Client activated."
  },

  async close(clientId: string): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Client deactivated." }
    const res = await axiosClient.put(`/api/client/close/${clientId}`)
    return res.data?.Msg ?? res.data?.message ?? "Client deactivated."
  },

  async getMatters(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { clientMatters } = await import("@/data/static")
      await new Promise(r => setTimeout(r, 150))
      return pageOf(clientMatters as unknown as Record<string, unknown>[], p)
    }
    // Old LMS: GET /matter/mini/hierarchy/by-client → response.data.data (array)
    const res = await axiosClient.get("/api/matter/mini/hierarchy/by-client", { params: { clientId } })
    const list = unwrapList(res.data?.data ?? res.data) as unknown as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getInvoices(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { clientInvoices } = await import("@/data/static")
      await new Promise(r => setTimeout(r, 150))
      return pageOf(clientInvoices as unknown as Record<string, unknown>[], p)
    }
    // Old LMS invoices use /invoice/filter/all/v2 with clientId (no dedicated by-client route).
    const res = await axiosClient.post("/api/invoice/filter/all/v2", {}, {
      params: {
        clientId,
        matterId: "",
        invoiceStatus: "All",
        billingType: "",
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

  async getTasks(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { matterTasks } = await import("@/data/static")
      return pageOf(matterTasks as unknown as Record<string, unknown>[], p)
    }
    // Old LMS: /task/get/all-task?eventType=CLIENT&eventTypeId=... (server-paginated)
    const res = await axiosClient.get("/api/task/get/all-task", {
      params: { eventType: "CLIENT", eventTypeId: clientId, pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrapPage(res.data?.data ?? res.data, p)
  },

  async getTimelogs(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { matterTimelogs } = await import("@/data/static")
      return pageOf(matterTimelogs as unknown as Record<string, unknown>[], p)
    }
    // Old LMS: GET /activity/get/by/Client → response.data.data (raw array)
    const res = await axiosClient.get("/api/activity/get/by/Client", {
      params: { clientId },
    })
    const list = unwrapList(res.data?.data ?? res.data) as unknown as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getLogs(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { matterLogs } = await import("@/data/static")
      return pageOf(matterLogs as unknown as Record<string, unknown>[], p)
    }
    // Old LMS: /activity/log/get?clientId=...&matterId=&taskId=&leadId=&hearingId=
    const res = await axiosClient.get("/api/activity/log/get", {
      params: { clientId, matterId: "", taskId: "", leadId: "", hearingId: "" },
    })
    const list = unwrapList(res.data?.data ?? res.data) as unknown as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getFinanceContacts(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      const { matterFinanceContacts } = await import("@/data/static")
      return pageOf(matterFinanceContacts as unknown as Record<string, unknown>[], p)
    }
    // Old LMS: /client/finance-contacts/list?clientId= → response.data.data (raw array)
    const res = await axiosClient.get("/api/client/finance-contacts/list", {
      params: { clientId },
    })
    const list = unwrapList(res.data?.data ?? res.data) as unknown as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getLfas(clientId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      return pageOf([
        { id: "lfa1", agreementNo: "LFA-2026-014", lfaNo: "LFA-2026-014", billingType: "Hourly", lfaType: "Hourly", lfaStatus: "ACTIVE", status: "ACTIVE", createdAt: "2026-07-01" },
      ] as Record<string, unknown>[], p)
    }
    // Old client LFA tab: /lfa/get/only/client?clientId= → response.data.data (array)
    const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId, matterId: "" } })
    const list = unwrapList(res.data?.data ?? res.data) as unknown as Record<string, unknown>[]
    return pageOf(list, p)
  },

  async getRevenue(clientId: string) {
    if (env.USE_STATIC_DATA) {
      return { billed: 25250, collected: 15750, outstanding: 9500 }
    }
    const res = await axiosClient.get("/api/invoice/client/revenue/v2", { params: { clientId } })
    return res.data?.data ?? res.data ?? {}
  },
}
