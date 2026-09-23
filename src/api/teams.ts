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

const STATIC_TEAMS = [
  {
    id: "t1",
    name: "Litigation Team",
    hod: { id: "u1", firstName: "Sarah", lastName: "Johnson" },
  },
  {
    id: "t2",
    name: "Corporate Team",
    hod: { id: "u4", firstName: "Talha", lastName: "Akhter" },
  },
]

const STATIC_HIERARCHY = {
  id: "t1",
  name: "Litigation Team",
  memberId: "u1",
  memberName: "Sarah Johnson",
  members: [
    {
      memberId: "u2",
      memberName: "James Williams",
      members: [
        { memberId: "u3", memberName: "Dory Abi Khalil", members: [] },
      ],
    },
    { memberId: "u5", memberName: "Mashood Rafi", members: [] },
  ],
}

export const teamsApi = {
  async getMyTeams(p?: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      const rows = STATIC_TEAMS as unknown as Record<string, unknown>[]
      return p ? pageOf(rows, p) : pageOf(rows, { page: 0, pageSize: 50, filters: {} })
    }
    const res = await axiosClient.get("/api/teams/my/teams")
    const rows = (Array.isArray(res.data) ? res.data : res.data?.data ?? []) as Record<string, unknown>[]
    return p ? pageOf(rows, p) : pageOf(rows, { page: 0, pageSize: 200, filters: {} })
  },

  async getHierarchy(teamId: string) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      return { ...STATIC_HIERARCHY, id: teamId }
    }
    const res = await axiosClient.get(`/api/teams/hierarchy/${teamId}`)
    return res.data?.data ?? res.data
  },

  async getMemberMatters(attorneyId: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "m1", title: "260303", status: "OPEN", billingType: "Hourly" },
        { id: "m2", title: "260293", status: "OPEN", billingType: "Hourly" },
      ] as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/report/matter/filter", {
      params: { attorney: attorneyId, pageNumber: p.page, pageSize: p.pageSize },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (d.content ?? []) as Record<string, unknown>[]
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? 1),
      number: p.page,
      size: p.pageSize,
      first: p.page === 0,
      last: true,
      empty: content.length === 0,
    }
  },

  async getMemberTasks(attorneyId: string, taskStatus: string, p: GridParams) {
    if (env.USE_STATIC_DATA) {
      return pageOf([
        { id: "tk1", title: "Draft reply", taskStatus: taskStatus || "Pending", dueDate: "2026-08-20" },
      ] as Record<string, unknown>[], p)
    }
    const res = await axiosClient.get("/api/task/by/attorney", {
      params: {
        eventType: "MATTER",
        taskStatus,
        attorneyId,
        pageNumber: p.page,
        pageSize: p.pageSize,
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (d.content ?? (Array.isArray(d) ? d : [])) as Record<string, unknown>[]
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? 1),
      number: p.page,
      size: p.pageSize,
      first: p.page === 0,
      last: true,
      empty: content.length === 0,
    }
  },
}
