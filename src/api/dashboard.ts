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
    if (env.USE_STATIC_DATA) return []
    const r = await axiosClient.get("/api/activity/get/recent/activity")
    const payload = r.data?.data ?? r.data ?? {}
    const clientActs = Array.isArray(payload.clientRecentActivity) ? payload.clientRecentActivity : []
    const matterActs = Array.isArray(payload.matterRecentActivity) ? payload.matterRecentActivity : []
    return [...clientActs, ...matterActs]
  },

  async favouriteClients() {
    if (env.USE_STATIC_DATA) return []
    const r = await axiosClient.get("/api/fav/client/my")
    return unwrapAxiosList(r.data)
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
        totalDiscountedHours: 0,
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
        { roleId: null, roleName: "Solo", count: 5, roles: null },
        { roleId: null, roleName: "Total", count: 8, roles: null },
      ]
    }
    const r = await axiosClient.get("/api/dashboard/my-role-summary")
    const data = r.data?.data ?? r.data
    return Array.isArray(data) ? data : []
  },

  async mattersPerRole(roleId: string, roleName: string) {
    if (env.USE_STATIC_DATA) return []
    const r = await axiosClient.get("/api/matter/details/per-role", {
      params: { roleId: roleId || "", roleName: roleName || "", pageNumber: 0, pageSize: 20 },
    })
    return unwrapAxiosList(r.data)
  },
}
