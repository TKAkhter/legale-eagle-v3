import { transformUser } from '@/transformers/user.transformer'
import { env }         from "@/config/env"
import { axiosClient } from "@/lib/api/axios"
import { lookups as staticLookups } from "@/data/static"

export const adminApi = {
  async getUsers(params: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) {
      return { content: staticLookups.users, totalElements: staticLookups.users.length, totalPages: 1, number: 0, size: 25 }
    }
    const res = await axiosClient.get("/api/user/get", { params })
    return res.data?.data ?? res.data
  },

  async getUserById(userId: string) {
    if (env.USE_STATIC_DATA) return staticLookups.users.find(u => u.id === userId) ?? staticLookups.users[0]
    const res = await axiosClient.get("/api/user/get/by/id", { params: { userId } })
    return res.data?.data ?? res.data
  },

  async getUsersMin() {
    if (env.USE_STATIC_DATA) return staticLookups.users.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }))
    const res = await axiosClient.get("/api/user/get/min")
    return res.data?.data ?? []
  },

  async inviteUser(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/sendRequest", data)
  },

  async updateUser(userId: string, data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/edit", { userId, ...data })
  },

  async blockUser(userId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.put(`/api/user/block/${userId}`)
  },

  async resetPassword(userId: string, password: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/change/password/admin", { userId, password })
  },

  async getGroups() {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/group/get")
    return res.data?.data ?? []
  },


  async saveGroupPermissions(groupId: string, permission: unknown[]) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/group/add/individual/permission", { groupId, permission })
  },

  // Lookup data
  async getPracticeAreas() {
    if (env.USE_STATIC_DATA) return staticLookups.practiceAreas
    const res = await axiosClient.get("/api/practice-area/get")
    return res.data?.data ?? []
  },

  async getLeadSources() {
    if (env.USE_STATIC_DATA) return staticLookups.leadSources
    const res = await axiosClient.get("/api/lead-source/get")
    return res.data?.data ?? []
  },





  async getNotifications() {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/util/get/notification")
    return res.data?.data ?? []
  },
  async getLocations() {
    if (env.USE_STATIC_DATA) return []
    const r = await axiosClient.get("/api/location/get")
    return r.data?.data ?? r.data ?? []
  },

  async createLocation(data: Record<string,unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r,400)); return { id: `loc-${Date.now()}`, ...data } }
    const r = await axiosClient.post("/api/location/add", data)
    return r.data?.data ?? r.data
  },

  async deleteLocation(id: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r,300)); return }
    await axiosClient.delete(`/api/location/delete/${id}`)
  },

  async getSetupInfo() {
    if (env.USE_STATIC_DATA) return { totalLeads:3, totalMatters:3, totalClients:2, totalInvoices:3, totalUsers:4, totalGroups:2 }
    const r = await axiosClient.get("/api/dashboard/get/setup")
    return r.data?.data ?? r.data ?? {}
  },
  async getPermissionsMatrix(): Promise<Record<string,unknown>[]> {
    if (env.USE_STATIC_DATA) return []
    const [groups, menu] = await Promise.all([
      axiosClient.get("/api/group/get"),
      axiosClient.get("/api/user/get/access/menu"),
    ])
    return groups.data?.data ?? []
  },

  async getDepartments(): Promise<Record<string,unknown>[]> {
    if (env.USE_STATIC_DATA) return [
      { id:"d1", name:"Corporate" }, { id:"d2", name:"Litigation" },
      { id:"d3", name:"Family Law" }, { id:"d4", name:"Real Estate" },
    ]
    const r = await axiosClient.get("/api/util/list/department")
    return r.data?.data ?? r.data ?? []
  },

  async getDesignations(): Promise<Record<string,unknown>[]> {
    if (env.USE_STATIC_DATA) return [
      { id:"des1", name:"Partner" }, { id:"des2", name:"Associate" },
      { id:"des3", name:"Senior Associate" }, { id:"des4", name:"Paralegal" },
    ]
    const r = await axiosClient.get("/api/util/get/designation")
    return r.data?.data ?? r.data ?? []
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.post("/api/user/change/password/admin", { userId, newPassword })
  },

  async updateSettings(data: Record<string,unknown>): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.put("/api/company/update", data)
  },

  async createGroup(data: Record<string,unknown>): Promise<Record<string,unknown>> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return { id:`g-${Date.now()}`, ...data } }
    const r = await axiosClient.post("/api/group/add", data)
    return r.data?.data ?? r.data
  },

}