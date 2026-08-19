import { transformUser } from '@/transformers/user.transformer'
import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
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

  async createGroup(name: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "g-new" } }
    const res = await axiosClient.post("/api/group/add", { name })
    return res.data?.data ?? res.data
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

  async getDepartments() {
    if (env.USE_STATIC_DATA) return staticLookups.departments
    const res = await axiosClient.get("/api/util/list/department")
    return res.data?.data ?? []
  },

  async getDesignations() {
    if (env.USE_STATIC_DATA) return staticLookups.designations
    const res = await axiosClient.get("/api/util/get/designation")
    return res.data?.data ?? []
  },

  async getNotifications() {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/util/get/notification")
    return res.data?.data ?? []
  },
}
