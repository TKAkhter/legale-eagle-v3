import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
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
  return pageOf(content, p)
}

const STATIC = [
  { id: "h1", hearingTitle: "CMC", matterTitle: "260303", hearingDate: "2026-09-25T10:00:00", location: "Dubai Courts", status: "Scheduled", caseNo: "C-100" },
  { id: "h2", hearingTitle: "Trial", matterTitle: "260293", hearingDate: "2026-08-01T09:00:00", location: "Abu Dhabi Courts", status: "Closed", caseNo: "C-200" },
]

export const hearingsApi = {
  async getList(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(STATIC as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/hearing/get/continue", {
      params: {
        hearingFromDate: f.fromDate ?? "",
        hearingToDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
        matterId: f.matterId ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getHistory(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pageOf(STATIC.filter(h => h.status === "Closed") as Record<string, unknown>[], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/hearing/get/parent", {
      params: {
        matterId: f.matterId ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getUpcoming(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      return pageOf(STATIC.filter(h => h.status === "Scheduled") as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/hearing/for/attorney", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async continueHearing(data: FormData | Record<string, unknown>) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: "h-continued" }
    }
    const res = await axiosClient.post("/api/hearing/add/continue", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    })
    return res.data?.data ?? res.data
  },

  async closeHearing(hearingId: string, data: { closingDate?: string; decision?: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: hearingId }
    }
    const res = await axiosClient.put(`/api/hearing/close/${hearingId}`, { hearingId, ...data })
    return res.data?.data ?? res.data
  },

  /** Reopen a closed hearing (LMS OpenHearings → PUT /hearing/open/:id). */
  async openHearing(hearingId: string, data: { openingDate?: string; decision?: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: hearingId }
    }
    const res = await axiosClient.put(`/api/hearing/open/${hearingId}`, { hearingId, ...data })
    return res.data?.data ?? res.data
  },

  async getByMatterAndId(matterId: string, hearingId: string) {
    if (env.USE_STATIC_DATA) {
      return STATIC.find(h => h.id === hearingId) ?? STATIC[0]
    }
    const res = await axiosClient.get(`/api/hearing/get/${matterId}/${hearingId}`)
    return res.data?.data ?? res.data
  },

  /** Parent → child chain for a hearing (LMS HearingsTree). */
  async getParentChild(parentId: string): Promise<Record<string, unknown>[]> {
    if (env.USE_STATIC_DATA) {
      return STATIC.filter(h => h.id === parentId || h.status === "Scheduled") as Record<string, unknown>[]
    }
    const res = await axiosClient.get("/api/hearing/get/parent/child", { params: { parentId } })
    const data = res.data?.data ?? res.data ?? []
    return Array.isArray(data) ? data : []
  },

  /** Activity logs for a hearing (LMS Logs → GET /activity/log/get?hearingId=). */
  async getLogs(hearingId: string, p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "l1", logType: "Hearing", logTitle: "Hearing created", createdBy: "Admin", createdAt: "2026-09-01T10:00:00" },
      ], p)
    }
    const res = await axiosClient.get("/api/activity/log/get", {
      params: { clientId: "", matterId: "", taskId: "", leadId: "", hearingId },
    })
    const list = (Array.isArray(res.data?.data) ? res.data.data
      : Array.isArray(res.data) ? res.data
      : []) as Record<string, unknown>[]
    return pageOf(list, p)
  },

  /** Notes related to a hearing (LMS Notes → POST /notes/get noteRelatedTo=HEARING). */
  async getNotes(hearingId: string, p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "n1", title: "Prep note", textContent: "Bring exhibits", noteType: "Text", createdAt: "2026-09-02T09:00:00" },
      ], p)
    }
    const res = await axiosClient.post("/api/notes/get/v2", null, {
      params: {
        noteRelatedTo: "HEARING",
        getNoteRelatedToId: hearingId,
        isPaginated: true,
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /**
   * Add hearing note — Text or Voice (LMS POST /notes/add).
   * Voice: upload blob via /util/fileUpload (folder HEARING/audio), then noteType Voice + voiceContent URL.
   */
  async addNote(
    hearingId: string,
    payload: {
      title: string
      content?: string
      noteType?: "Text" | "Voice"
      voiceBlob?: Blob
      voiceFileName?: string
    },
  ) {
    const noteType = payload.noteType ?? "Text"

    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return {
        id: `note-${Date.now()}`,
        title: payload.title,
        noteType,
        textContent: noteType === "Text" ? (payload.content ?? "") : "",
        voiceContent: noteType === "Voice"
          ? (payload.voiceBlob ? URL.createObjectURL(payload.voiceBlob) : "")
          : "",
      }
    }

    let voiceContent = ""
    if (noteType === "Voice") {
      if (!payload.voiceBlob?.size) {
        throw new Error("Record a voice note before saving")
      }
      const mime = payload.voiceBlob.type || "audio/webm"
      const ext = mime.includes("ogg") ? "ogg"
        : mime.includes("mp4") || mime.includes("m4a") ? "m4a"
        : mime.includes("wav") ? "wav"
        : "webm"
      const file = new File(
        [payload.voiceBlob],
        payload.voiceFileName ?? `voice-note.${ext}`,
        { type: mime },
      )
      const formData = new FormData()
      formData.append("file", file, file.name)
      formData.append("folderName", "HEARING/audio")
      formData.append("uuid", hearingId)
      const uploadRes = await axiosClient.post("/api/util/fileUpload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const uploaded = uploadRes.data?.data ?? uploadRes.data
      const first = Array.isArray(uploaded) ? uploaded[0] : uploaded
      if (typeof first === "string") {
        voiceContent = first
      } else if (first && typeof first === "object") {
        const o = first as Record<string, unknown>
        voiceContent = String(o.url ?? o.document ?? o.fileUrl ?? o.path ?? o.file ?? "")
      }
      if (!voiceContent) throw new Error("Voice upload did not return a file URL")
    }

    const res = await axiosClient.post("/api/notes/add", {
      noteRelatedTo: "HEARING",
      noteRelatedToId: hearingId,
      getNoteRelatedToId: hearingId,
      noteType,
      title: payload.title,
      textContent: noteType === "Text" ? (payload.content ?? "") : "",
      voiceContent,
    })
    return res.data?.data ?? res.data
  },

  /**
   * Hearing tasks — LMS tabs call different endpoints:
   * - Assigned → GET /task/get/assign/task
   * - Self → GET /task/get/individual/single/type
   * - Approval Pre → GET /task/get/individual/pre/approve
   * - Approval Post → GET /task/get/individual/post/approve
   * Filters via p.filters.taskFilter ("ASSIGNED"|"SELF"|"APPROVAL") and approvalPhase ("pre"|"post").
   */
  async getTasks(hearingId: string, p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    const taskFilter = String(f.taskFilter ?? "ASSIGNED").toUpperCase()
    const approvalPhase = String(f.approvalPhase ?? "pre").toLowerCase()

    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "t1", taskName: "Prepare brief", taskStatus: "Pending", priority: "High", taskDeadLine: "2026-09-20" },
      ], p)
    }

    let path = "/api/task/get/assign/task"
    if (taskFilter === "SELF") path = "/api/task/get/individual/single/type"
    else if (taskFilter === "APPROVAL") {
      path = approvalPhase === "post"
        ? "/api/task/get/individual/post/approve"
        : "/api/task/get/individual/pre/approve"
    }

    const res = await axiosClient.get(path, {
      params: { eventType: "HEARING", eventTypeId: hearingId },
    })
    const list = (Array.isArray(res.data?.data) ? res.data.data
      : Array.isArray(res.data) ? res.data
      : []) as Record<string, unknown>[]
    return pageOf(list, p)
  },
}
