import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { unwrapAxiosList } from "@lib/utils/unwrap"

export const dashboardApi = {
  async getSetup() {
    if (env.USE_STATIC_DATA) return null
    const r = await axiosClient.get("/api/dashboard/get/setup")
    return r.data?.data ?? null
  },

  async leadCount() {
    if (env.USE_STATIC_DATA) return { openCount: 3, convertedCount: 2, writeOffCount: 0 }
    const r = await axiosClient.get("/api/dashboard/lead/count")
    return r.data?.data ?? {}
  },

  async matterCount() {
    if (env.USE_STATIC_DATA) return { open: 5, close: 1, reOpen: 1 }
    const r = await axiosClient.get("/api/dashboard/matter/count")
    return r.data?.data ?? {}
  },

  async taskCount() {
    if (env.USE_STATIC_DATA) return { dueTask: 4, upcomingTask: 2, resubmitTask: 0, totalApproval: 1 }
    const r = await axiosClient.get("/api/dashboard/task/count")
    return r.data?.data ?? {}
  },

  async hearingRecent() {
    if (env.USE_STATIC_DATA) return { today: [], tomorrow: [] }
    const r = await axiosClient.get("/api/hearing/recent")
    return r.data?.hearingList?.series ?? { today: [], tomorrow: [] }
  },

  async monthlyMatters() {
    if (env.USE_STATIC_DATA) {
      return {
        open: [2, 3, 4, 3, 5, 4],
        closed: [1, 1, 2, 1, 2, 1],
        total: [3, 4, 6, 4, 7, 5],
      }
    }
    const r = await axiosClient.get("/api/analysis/monthly/matters")
    return r.data?.stats ?? r.data?.data?.stats ?? r.data ?? {}
  },

  async leadFollowups() {
    if (env.USE_STATIC_DATA) {
      return [
        {
          leads: { id: "l1", firstName: "Mohammed", lastName: "Al Rashid", natureOfDispute: "Contract dispute over construction delay" },
          leadFollowUp: { id: "fu1", content: "Call client about proposal" },
        },
      ]
    }
    const r = await axiosClient.get("/api/leads/assign/followup/status")
    const data = r.data?.data ?? r.data
    return Array.isArray(data) ? data : (data?.content ?? [])
  },

  async completeLeadFollowup(followupId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Follow-up completed."
    }
    const r = await axiosClient.post("/api/leads/update/follow/status", null, {
      params: { stageCompleted: true, followupId },
    })
    return String(r.data?.data ?? r.data?.Msg ?? r.data?.message ?? "Follow-up completed.")
  },

  async deadlineTasks() {
    if (env.USE_STATIC_DATA) return { today: [], tomorrow: [] }
    const r = await axiosClient.get("/api/task/deadline/task")
    const series = r.data?.data?.deadlineTask?.series
      ?? r.data?.deadlineTask?.series
      ?? r.data?.data?.series
      ?? r.data?.series
    return series ?? { today: [], tomorrow: [] }
  },

  async recentActivities() {
    if (env.USE_STATIC_DATA) {
      return {
        clientRecentActivity: [
          { client: { clientId: "c1", clientType: "COMPANY", companyName: "Al Rashid Holdings", firstName: "", email: [{ emailId: "m@holdings.ae" }] } },
        ],
        matterRecentActivity: [
          { matter: { matterId: "m1", title: "260303", description: "Building dispute", matterType: "Long_Matter", clientMini: { clientType: "COMPANY", companyName: "Al Rashid Holdings" } } },
        ],
      }
    }
    const r = await axiosClient.get("/api/activity/get/recent/activity")
    const payload = r.data?.data ?? r.data ?? {}
    return {
      clientRecentActivity: Array.isArray(payload.clientRecentActivity) ? payload.clientRecentActivity : [],
      matterRecentActivity: Array.isArray(payload.matterRecentActivity) ? payload.matterRecentActivity : [],
    }
  },

  async favouriteClients() {
    if (env.USE_STATIC_DATA) {
      return [
        {
          id: "c1", clientId: "c1", companyName: "Al Rashid Holdings", firstName: "Mohammed",
          openMatter: 2, lastActivityDate: "2026-08-01", clientType: "COMPANY", favourite: true,
        },
        {
          id: "c2", clientId: "c2", companyName: "", firstName: "Emily", lastName: "Harper",
          openMatter: 1, lastActivityDate: "2026-07-20", clientType: "PERSON", favourite: true,
        },
      ]
    }
    // Prefer dedicated fav list; fall back to mini list flagged favourite
    try {
      const r = await axiosClient.get("/api/fav/client/my")
      const list = unwrapAxiosList(r.data) as Record<string, unknown>[]
      if (list.length) {
        return list.map(c => ({
          ...c,
          id: String(c.clientId ?? c.id ?? ""),
          clientId: String(c.clientId ?? c.id ?? ""),
          favourite: true,
        }))
      }
    } catch { /* fall through */ }

    try {
      const r = await axiosClient.get("/api/client/mini/list")
      const list = unwrapAxiosList(r.data) as Record<string, unknown>[]
      return list
        .filter(c => Boolean(c.favourite ?? c.isFavourite ?? c.fav))
        .map(c => ({
          ...c,
          id: String(c.id ?? c.clientId ?? ""),
          clientId: String(c.clientId ?? c.id ?? ""),
        }))
    } catch {
      return []
    }
  },

  async favClientGroupName() {
    if (env.USE_STATIC_DATA) return "Demo Favourites"
    try {
      const r = await axiosClient.get("/api/fav/client/list/group")
      const data = r.data?.data ?? r.data
      const groups = Array.isArray(data) ? data : []
      // Without uuid wiring, return first group name if present
      const first = groups[0] as { name?: string } | undefined
      return first?.name ? String(first.name) : null
    } catch {
      return null
    }
  },

  async favClientMatters(clientId: string) {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "m1", title: "260303", billingType: "Hourly", status: "OPEN", description: "Building dispute", lastActivityDate: "2026-08-01" },
      ]
    }
    const r = await axiosClient.get("/api/matter/mini/by/client", { params: { clientId } })
    const list = unwrapAxiosList(r.data) as Record<string, unknown>[]
    return list.filter(m => String(m.status ?? "").toUpperCase() !== "CLOSE")
  },

  async unfavouriteClient(clientId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 200)); return }
    await axiosClient.post("/api/fav/client/mark", { clientId, makeFav: false })
  },

  async timeLogStats(fromDate: string, toDate: string, responsiblePersonId?: string) {
    if (env.USE_STATIC_DATA) {
      return [{
        responsiblePerson: "You",
        totalHours: 40,
        totalBillableHours: 32,
        totalNonBillableHours: 8,
        totalRevenueAllocatedHours: 30,
        totalPurgedHours: 0,
        totalDiscountedHours: 1,
        nonBillableNonMatterHours: 2,
      }]
    }
    const r = await axiosClient.get("/api/report/activity/statistics/by-person", {
      params: {
        fromDate,
        toDate,
        responsiblePersonId: responsiblePersonId ?? "",
        pageNumber: 0,
        pageSize: 100,
        sortBy: "totalHours",
        sortDir: "DESC",
      },
    })
    return unwrapAxiosList(r.data)
  },

  async myRoleSummary() {
    if (env.USE_STATIC_DATA) {
      return [
        { roleId: "1", roleName: "Handling Work", count: 3, roles: [] },
        {
          roleId: "2", roleName: "Assisting", count: 4,
          roles: [
            { roleId: "2a", roleName: "Junior Associate", count: 2 },
            { roleId: "2b", roleName: "Paralegal", count: 2 },
          ],
        },
        { roleId: null, roleName: "Solo", count: 5, roles: null },
        { roleId: null, roleName: "Total", count: 12, roles: null },
      ]
    }
    const r = await axiosClient.get("/api/dashboard/my-role-summary", {
      params: { assistingCombined: true },
    })
    const data = r.data?.data ?? r.data
    return Array.isArray(data) ? data : []
  },

  async mattersPerRole(roleId: string, roleName: string, page = 0, size = 20) {
    if (env.USE_STATIC_DATA) {
      return {
        content: [
          {
            matterId: "m1", title: "260303", practiceArea: { name: "Litigation" },
            clientMini: { companyName: "Al Rashid Holdings", clientType: "COMPANY" },
            teamMembers: [{ firstName: "Sarah", lastName: "Johnson", role: "Handling Work" }],
            status: "OPEN", matterSubject: "Dispute", description: "Building dispute scope",
            createdAt: "2026-07-09",
          },
        ],
        totalElements: 1,
      }
    }
    const r = await axiosClient.get("/api/matter/details/per-role", {
      params: { roleId: roleId || "", roleName: roleName || "", page, size, pageNumber: page, pageSize: size },
    })
    const data = r.data?.data ?? r.data
    if (Array.isArray(data)) return { content: data, totalElements: data.length }
    return {
      content: unwrapAxiosList(r.data),
      totalElements: Number(data?.totalElements ?? data?.total ?? 0),
    }
  },

  async monthlyMattersPerRole() {
    if (env.USE_STATIC_DATA) {
      return {
        "Handling Work": [1, 2, 2, 3, 2, 4, 3, 3, 2, 2, 1, 2],
        Supervisor: [0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 0, 1],
        Assisting: [1, 1, 2, 1, 2, 2, 2, 1, 2, 1, 1, 1],
        Solo: [2, 2, 3, 2, 3, 2, 3, 2, 2, 3, 2, 2],
      }
    }
    const r = await axiosClient.get("/api/analysis/monthly/matters/per-role")
    return r.data?.stats ?? r.data?.data?.stats ?? r.data?.data ?? r.data ?? {}
  },

  /** LMS `/meeting/get/shcedules` (typo preserved) — today/tomorrow meeting series. */
  async meetingSchedules() {
    if (env.USE_STATIC_DATA) {
      return {
        today: [
          {
            title: "Client intake",
            meetingStartTime: "10:00",
            meetingEndTime: "10:30",
            meetingWithName: "Al Rashid Holdings",
            addedByName: "Sarah Johnson",
            note: "Discuss proposal",
          },
        ],
        tomorrow: [],
      }
    }
    const r = await axiosClient.get("/api/meeting/get/shcedules")
    const data = r.data?.data ?? r.data ?? {}
    const series = data?.meetings?.series ?? data?.series ?? data
    return {
      today: Array.isArray(series?.today) ? series.today : [],
      tomorrow: Array.isArray(series?.tomorrow) ? series.tomorrow : [],
    }
  },
}
