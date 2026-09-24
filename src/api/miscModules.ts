import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

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

export interface ReferralCommissionRow extends Record<string, unknown> {
  id: string
  clientId: string
  clientName: string
  referralUserName: string
  invoiceNo: string
  lfaNo: string
  invoiceAmount: number
  commissionPercentage: number
  commissionAmount: number
  createdAt: string
}

export const miscModulesApi = {
  async getTransfers(p: GridParams, status: "pending" | "completed" = "pending") {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "tr1",
        fromClientName: "Al Rashid Holdings",
        toClientName: "KM Group",
        status: status === "pending" ? "Pending" : "Completed",
        createdAt: "2026-09-01",
      }], p)
    }
    const path = status === "pending" ? "/api/transfer/pending" : "/api/transfer/completed"
    const res = await axiosClient.get(path, {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async createTransfer(payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) return "Transfer created"
    const res = await axiosClient.post("/api/transfer/client/to/client", payload)
    return String(res.data?.message ?? res.data?.Msg ?? "Transfer created")
  },

  async getMultiStepTasks(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "mst1",
        uuid: "mst1",
        taskName: "Onboarding checklist",
        taskStatus: "Pending",
        steps: 4,
        createdAt: "2026-08-15",
      }], p)
    }
    const res = await axiosClient.get("/api/multistepstask", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getDocumentReminders(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "dr1",
        documentName: "Passport copy",
        matterTitle: "260303",
        reminderDate: "2026-09-30",
        status: "Active",
      }], p)
    }
    const res = await axiosClient.get("/api/document/reminder/list", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async createDocumentReminder(payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) return "Reminder created"
    const res = await axiosClient.post("/api/document/reminder/create", payload)
    return String(res.data?.message ?? res.data?.Msg ?? "Reminder created")
  },

  async createMultiStepTask(payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return "Multi-step task created" }
    const res = await axiosClient.post("/api/task/add", payload)
    return String(res.data?.message ?? res.data?.Msg ?? "Multi-step task created")
  },

  async getPendingMatters(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "pl1",
        name: "Pending Corp Dispute",
        companyName: "Pending Corp Dispute",
        clientName: "Al Rashid Holdings",
        status: "PROPOSAL",
        leadSource: "Referral",
        practiceArea: "Litigation",
        description: "Corporate dispute SOW",
        phones: [{ phoneNo: "555-0100", primary: true }],
        email: [{ emailId: "pending@example.com" }],
        convertedAt: "2026-08-20",
        referredBy: "Internal Desk",
        createdAt: "2026-09-01",
      }], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/leads/pending/matter", {
      params: {
        clientId: f.clientId ?? "",
        stage: f.stage ?? "",
        leadSource: f.leadSource ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** LMS Email Excel — GET returns Msg/URL toast, not a blob download. */
  async exportPendingMatters(filters: Record<string, unknown> = {}): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Excel will be emailed shortly."
    }
    const res = await axiosClient.get("/api/reports/export-excel/pending-matter-creation", {
      params: {
        clientId: filters.clientId ?? "",
        stage: filters.stage ?? "",
        leadSource: filters.leadSource ?? "",
        fromDate: filters.fromDate ?? "",
        toDate: filters.toDate ?? "",
        departmentId: filters.departmentId ?? "",
      },
    })
    return String(res.data?.Msg ?? res.data?.message ?? "Excel export requested.")
  },

  async getReferralPartners(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "rp1",
        referralName: "Mohammad Ovesh",
        clientName: "Al Rashid Holdings",
        amount: 15000,
        status: "Active",
      }], p)
    }
    const res = await axiosClient.get("/api/lfa/my/referral", {
      params: { pageNumber: p.page, pageSize: p.pageSize },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  /** LFA agreements available for referral commission filter (dropdown source). */
  async getMyReferralAgreements(): Promise<{ id: string; agreementNo: string; billingType?: string }[]> {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "lfa1", agreementNo: "LFA-1001", billingType: "Hourly" },
        { id: "lfa2", agreementNo: "LFA-1002", billingType: "Fixed" },
      ]
    }
    const res = await axiosClient.get("/api/lfa/my/referral")
    const d = res.data?.data ?? res.data ?? []
    const list = Array.isArray(d) ? d : (d?.content ?? [])
    return (list as Record<string, unknown>[]).map(r => ({
      id: String(r.id ?? ""),
      agreementNo: String(r.agreementNo ?? r.lfaNo ?? r.id ?? ""),
      billingType: r.billingType != null ? String(r.billingType) : undefined,
    })).filter(r => r.id)
  },

  /** Commission rows for a selected LFA agreement. */
  async getReferralCommissions(lfaId: string, limitValue: number): Promise<ReferralCommissionRow[]> {
    if (env.USE_STATIC_DATA) {
      const all: ReferralCommissionRow[] = [
        {
          id: "rc1",
          clientId: "c1",
          clientName: "Al Rashid Holdings",
          referralUserName: "Mohammad Ovesh",
          invoiceNo: "INV-9001",
          lfaNo: "LFA-1001",
          invoiceAmount: 12000,
          commissionPercentage: 10,
          commissionAmount: 1200,
          createdAt: "2026-08-15",
        },
        {
          id: "rc2",
          clientId: "c2",
          clientName: "KM Group",
          referralUserName: "Mohammad Ovesh",
          invoiceNo: "INV-9002",
          lfaNo: "LFA-1001",
          invoiceAmount: 8000,
          commissionPercentage: 10,
          commissionAmount: 800,
          createdAt: "2026-08-20",
        },
      ]
      return limitValue === 0 ? all : all.slice(0, limitValue)
    }
    const res = await axiosClient.get(`/api/commission/get/${lfaId}`, {
      params: { limitValue },
    })
    const raw = res.data?.data ?? res.data ?? []
    const list = Array.isArray(raw) ? raw : []
    return list.map((row: Record<string, unknown>, i: number) => {
      const invoice = (row.invoice ?? {}) as Record<string, unknown>
      const client = (invoice.clientMini ?? invoice.client ?? {}) as Record<string, unknown>
      return {
        id: String(row.id ?? `${lfaId}-${i}`),
        clientId: String(client.id ?? client.clientId ?? ""),
        clientName: String(client.companyName ?? client.name ?? client.clientName ?? "—"),
        referralUserName: String(row.referralUserName ?? "—"),
        invoiceNo: String(invoice.invoiceNo ?? "—"),
        lfaNo: String(invoice.lfaNo ?? "—"),
        invoiceAmount: Number(row.invoiceAmount ?? 0),
        commissionPercentage: Number(row.commissionPercentage ?? 0),
        commissionAmount: Number(row.commissionAmount ?? 0),
        createdAt: String(row.createdAt ?? ""),
      }
    })
  },

  async getShortMatters(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "sm1",
        title: "Quick consult",
        clientName: "Al Rashid Holdings",
        status: "Open",
        matterType: "Short_Matter",
      }], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/matter/list/by/client/filter", {
      params: {
        clientId: f.clientId ?? "",
        matterType: "Short_Matter",
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getDepartmentInvoiceApprovals(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "dia1",
        invoiceNo: "INV-2001",
        clientName: "Al Rashid Holdings",
        taxableAmount: 12000,
        status: "Pending",
      }], p)
    }
    const res = await axiosClient.get("/api/invoice/ap/get/for-department")
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getDepartmentActivityApprovals(p: GridParams) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return pg([{
        id: "daa1",
        activityApprovalId: "daa1",
        activity: "Document Review",
        activityName: "Document Review",
        matterTitle: "260303",
        matter: { title: "260303" },
        client: { companyName: "Al Rashid Holdings" },
        responsiblePerson: { firstName: "Sarah", lastName: "Johnson" },
        userName: "Sarah Johnson",
        totalHours: 3.5,
        billing: 3500,
        entryDate: "2026-07-01",
        revenueStatus: "PRE_APPROVAL",
        status: "Pending",
      }], p)
    }
    const f = p.filters ?? {}
    const res = await axiosClient.get("/api/activity/for-approval/for-secretary", {
      params: {
        pageNumber: p.page,
        pageSize: p.pageSize,
        matterId: f.matterId ?? "",
        fromDate: f.fromDate ?? "",
        toDate: f.toDate ?? "",
      },
    })
    return unwrap(res.data?.data ?? res.data, p)
  },

  async getInvoiceSnaps(invoiceId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "snap1", createdAt: "2026-08-01", action: "Created", userName: "Admin" },
        { id: "snap2", createdAt: "2026-08-05", action: "Updated", userName: "Sarah Johnson" },
      ]
    }
    const res = await axiosClient.get("/api/matter/get/snap", {
      params: { id: invoiceId, snapType: "INVOICE" },
    })
    const data = res.data?.data ?? res.data ?? []
    return Array.isArray(data) ? data : []
  },

  async getMeetingTime() {
    if (env.USE_STATIC_DATA) {
      return { startTime: "09:00", endTime: "18:00", slotMinutes: 30 }
    }
    const res = await axiosClient.get("/api/user/get/meeting/time")
    return res.data?.data ?? res.data ?? {}
  },

  async saveMeetingTime(payload: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) return "Meeting time saved"
    const res = await axiosClient.post("/api/user/meeting/time/setup", payload)
    return String(res.data?.message ?? res.data?.Msg ?? "Meeting time saved")
  },
}
