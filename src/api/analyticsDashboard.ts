/**
 * Department / personal analytics dashboard APIs (LMS `/department/analytics`).
 */
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { PageResponse } from "@/types/common.types"

async function getList(path: string): Promise<Record<string, unknown>[]> {
  if (env.USE_STATIC_DATA) return []
  const res = await axiosClient.get(`/api${path}`)
  const d = res.data?.data ?? res.data ?? []
  return Array.isArray(d) ? d : []
}

async function getPage(
  path: string,
  params: Record<string, string | number>,
): Promise<PageResponse<Record<string, unknown>>> {
  if (env.USE_STATIC_DATA) {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 5,
      first: true,
      last: true,
      empty: true,
    }
  }
  const res = await axiosClient.get(`/api${path}`, { params })
  const raw = res.data?.data ?? res.data ?? {}
  const content = Array.isArray(raw.content) ? raw.content : Array.isArray(raw) ? raw : []
  const totalElements = Number(raw.totalElements ?? content.length)
  const size = Number(raw.size ?? params.pageSize ?? 5)
  const number = Number(raw.number ?? params.page ?? params.pageNo ?? 0)
  const totalPages = Number(raw.totalPages ?? Math.max(1, Math.ceil(totalElements / size)))
  return {
    content,
    totalElements,
    totalPages,
    number,
    size,
    first: number === 0,
    last: number >= totalPages - 1,
    empty: content.length === 0,
  }
}

export const analyticsDashboardApi = {
  /** My — pending/overdue/upcoming/to-approve task counts */
  pendingOverdueTasks: () => getList("/analytics/dashboard/pending-overdue-task"),

  /** Department — stacked tasks by assignee */
  departmentTasks: () => getList("/analytics/dashboard/department/task"),

  /** Department — this-month timelog by user */
  departmentTimeLogs: () => getList("/analytics/dashboard/department-wise-user-report/this-month"),

  /** Department — open vs sleeping matters by person */
  departmentMatters: () => getList("/analytics/dashboard/department-wise-open-sleeping"),

  /** My — open sleeping matters */
  myOpenSleepingMatters: () => getList("/analytics/dashboard/task-open-sleeping-matter"),

  /** My — time log activity summary */
  myTimeLogEntries: () => getList("/analytics/dashboard/task-time-log-entries-activities"),

  favouriteClients: (page: number, pageSize = 5) =>
    getPage("/analytics/dashboard/get-favourite-client-list", { page, pageSize }),

  myOpenLeads: (page: number, pageSize = 5) =>
    getPage("/analytics/dashboard/my-open-leads", {
      leadType: "All",
      status: "Open",
      pageNo: page,
      pageSize,
    }),
}

export function buildMyTaskChart(data: Record<string, unknown>[]) {
  const counts: Record<string, number> = {
    Pending: 0,
    Overdue: 0,
    UpComing: 0,
    ToApprove: 0,
  }
  for (const item of data) {
    const statuses = (item.statuses as { taskStatus?: string; taskCount?: number }[] | undefined) ?? []
    for (const s of statuses) {
      const key = String(s.taskStatus ?? "")
      if (key in counts) counts[key] += Number(s.taskCount ?? 0)
    }
  }
  const entries = Object.entries(counts).filter(([, c]) => c > 0)
  return {
    categories: entries.map(([k]) => k),
    series: [{ name: "Tasks", data: entries.map(([, c]) => c) }],
  }
}

export function buildDepartmentTaskChart(data: Record<string, unknown>[]) {
  const aggregated: Record<string, { Pending: number; OverDue: number; ToApprove: number }> = {}
  for (const item of data) {
    const name = String(item.taskAssignPersonName ?? "—")
    if (!aggregated[name]) aggregated[name] = { Pending: 0, OverDue: 0, ToApprove: 0 }
    const statuses = (item.statuses as {
      pendingCount?: number
      overDueCount?: number
      toApproveCount?: number
    }[] | undefined) ?? []
    for (const s of statuses) {
      aggregated[name].Pending += Number(s.pendingCount ?? 0)
      aggregated[name].OverDue += Number(s.overDueCount ?? 0)
      aggregated[name].ToApprove += Number(s.toApproveCount ?? 0)
    }
  }
  const categories = Object.keys(aggregated)
  return {
    categories,
    series: [
      { name: "Pending", data: categories.map(n => aggregated[n].Pending) },
      { name: "OverDue", data: categories.map(n => aggregated[n].OverDue) },
      { name: "To Approve", data: categories.map(n => aggregated[n].ToApprove) },
    ],
  }
}

export function buildDepartmentMatterChart(data: Record<string, unknown>[]) {
  const categories = data.map(i => String(i.responsiblePersonName ?? "—"))
  return {
    categories,
    series: [
      { name: "Open", data: data.map(i => Number(i.openCount ?? i.open ?? 0)) },
      { name: "Sleeping", data: data.map(i => Number(i.sleepingCount ?? i.sleeping ?? 0)) },
    ],
  }
}

export function buildDepartmentTimeLogChart(data: Record<string, unknown>[]) {
  const labels: string[] = []
  const values: number[] = []
  for (const item of data) {
    const nested = item.userDepartmentWiseMonthResponse as {
      userName?: string
      totalHours?: number
    } | undefined
    const name = String(nested?.userName ?? item.userName ?? item.name ?? "—")
    const hours = Number(nested?.totalHours ?? item.totalHours ?? item.hours ?? 0)
    labels.push(name)
    values.push(hours)
  }
  return {
    categories: labels,
    series: [{ name: "Hours", data: values }],
  }
}

export function buildMyOpenSleepingChart(data: Record<string, unknown>[]) {
  const first = data[0] as {
    departmentWiseOpenSleeping?: { openCount?: number; sleepingCount?: number }
    openCount?: number
    sleepingCount?: number
  } | undefined
  const nested = first?.departmentWiseOpenSleeping
  const open = Number(nested?.openCount ?? first?.openCount ?? 0)
  const sleeping = Number(nested?.sleepingCount ?? first?.sleepingCount ?? 0)
  if (!open && !sleeping && !data.length) {
    return { categories: [] as string[], series: [] as { name: string; data: number[] }[] }
  }
  return {
    categories: ["Matters"],
    series: [
      { name: "Open Matters", data: [open] },
      { name: "Idle Matters", data: [sleeping] },
    ],
  }
}

export function buildMyTimeLogChart(data: Record<string, unknown>[]) {
  const first = data[0] as { dayWiseCount?: { date?: string; count?: number }[] } | undefined
  const days = [...(first?.dayWiseCount ?? [])].sort(
    (a, b) => new Date(String(a.date ?? 0)).getTime() - new Date(String(b.date ?? 0)).getTime(),
  )
  if (!days.length) {
    return { categories: [] as string[], series: [] as { name: string; data: number[] }[] }
  }
  const categories = days.map(d =>
    new Date(String(d.date)).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  )
  const counts = days.map(d => Number(d.count ?? 0))
  return {
    categories,
    series: [
      { name: "Me", data: counts },
      { name: "Expected", data: Array(categories.length).fill(7) as number[] },
    ],
  }
}

export interface AnalyticsClientRow extends Record<string, unknown> {
  id: string
  clientId: string
  clientName: string
  email: string
  telephone: string
  latestMatter: string
}

export interface AnalyticsLeadRow extends Record<string, unknown> {
  id: string
  leadId: string
  leadName: string
  email: string
  telephone: string
  practiceArea: string
}

export function mapFavouriteClient(raw: Record<string, unknown>): AnalyticsClientRow {
  const id = String(raw.clientId ?? raw.id ?? "")
  return {
    id,
    clientId: id,
    clientName: String(raw.clientName ?? raw.name ?? "—"),
    email: String(raw.email ?? raw.clientEmail ?? "—"),
    telephone: String(raw.telephone ?? raw.phone ?? raw.mobile ?? "—"),
    latestMatter: String(raw.latestMatter ?? raw.matterName ?? raw.latestMatterName ?? "—"),
  }
}

export function mapOpenLead(raw: Record<string, unknown>): AnalyticsLeadRow {
  const id = String(raw.leadId ?? raw.id ?? "")
  return {
    id,
    leadId: id,
    leadName: String(raw.leadName ?? raw.name ?? raw.fullName ?? "—"),
    email: String(raw.email ?? "—"),
    telephone: String(raw.telephone ?? raw.phone ?? raw.mobile ?? "—"),
    practiceArea: String(raw.practiceArea ?? raw.practiceAreaName ?? "—"),
  }
}
