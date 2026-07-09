import { axiosClient } from "@lib/api/axios"
export interface DashboardCounts { totalLeads?: number; openLeads?: number; totalMatters?: number; openMatters?: number; pendingTasks?: number; overdueTasks?: number }
export const dashboardApi = {
  async getCounts(): Promise<DashboardCounts> { const [l,m,t]=await Promise.allSettled([axiosClient.get("/api/dashboard/lead/count"),axiosClient.get("/api/dashboard/matter/count"),axiosClient.get("/api/dashboard/task/count")]); return {...(l.status==="fulfilled"?l.value.data?.data??l.value.data:{}),...(m.status==="fulfilled"?m.value.data?.data??m.value.data:{}),...(t.status==="fulfilled"?t.value.data?.data??t.value.data:{})} },
  async getMatterHistory() { const r=await axiosClient.get("/api/analytics/graph/matters-history-monthly"); return r.data?.data??r.data??[] },
  async getRevenue() { const r=await axiosClient.get("/api/analytics/graph/fixedfees-timelogs-revenue"); return r.data?.data??r.data??[] },
  async getTimelogSummary() { const r=await axiosClient.get("/api/analytics/graph/timelogs-summary-per-category"); return r.data?.data??r.data??[] },
  async getUpcomingHearings() { const r=await axiosClient.get("/api/analytics/dashboard/my-upcoming-hearing-today-and-tomorrow"); return r.data?.data??r.data??[] },
}
