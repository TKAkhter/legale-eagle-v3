import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { lookups as staticLookups } from "@/data/static"

const STATIC_LOCATIONS = [
  { id: "loc1", name: "Dubai Courts", country: "UAE", status: "Active" },
  { id: "loc2", name: "Abu Dhabi Judicial Dept", country: "UAE", status: "Active" },
]

const STATIC_GROUPS = [
  { id: "g1", name: "Administrators", permission: [{ menuId: "m1" }, { menuId: "m2" }] },
  { id: "g2", name: "Fee Earners", permission: [{ menuId: "m1" }] },
  { id: "g3", name: "Secretaries", permission: [] },
]

export const adminApi = {
  async getUsers(params: Record<string, unknown>) {
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

  async inviteUser(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/sendRequest", data)
  },

  async updateUser(userId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/edit", data, { params: { userId } })
  },

  async blockUser(userId: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.put(`/api/user/block/${userId}`)
  },

  async resetPassword(userId: string, newPassword: string, confirmPassword: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post(
      "/api/user/change/password/admin",
      { newPassword, confirmPassword },
      { params: { userId } },
    )
  },

  async setExtraPermission(userId: string, extraPermission: string, permissionType: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.put(`/api/user/extra/permission/${userId}`, null, {
      params: { extraPermission, permissionType },
    })
  },

  async setBackEntryPermission(userId: string, body: { backEntry: boolean; duration?: number; backEntryType?: string }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return }
    await axiosClient.put(`/api/user/back-entry/permission/${userId}`, body)
  },

  async getGroups() {
    if (env.USE_STATIC_DATA) return STATIC_GROUPS
    const res = await axiosClient.get("/api/group/get")
    return res.data?.data ?? []
  },

  async createGroup(name: string) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return { id: "g-new", name } }
    const res = await axiosClient.post("/api/group/add", { name })
    return res.data?.data ?? res.data
  },

  async editGroup(groupId: string, data: { name?: string; permission?: unknown[] }) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/group/edit", data, { params: { groupId } })
  },

  async saveGroupPermissions(groupId: string, permission: unknown[]) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    // Prefer full group edit with permission payload (LMS parity)
    try {
      await axiosClient.post("/api/group/edit", { permission }, { params: { groupId } })
    } catch {
      await axiosClient.post("/api/group/add/individual/permission", { groupId, permission })
    }
  },

  async getMenuList() {
    if (env.USE_STATIC_DATA) {
      return [
        { id: "m1", menuName: "Matters", parent: "0" },
        { id: "m2", menuName: "Clients", parent: "0" },
        { id: "m3", menuName: "Billing", parent: "0" },
        { id: "m4", menuName: "Reports", parent: "0" },
        { id: "m5", menuName: "Admin", parent: "0" },
      ]
    }
    const res = await axiosClient.get("/api/menu/menulist")
    return res.data?.data ?? res.data ?? []
  },

  async getCompanyInfo() {
    if (env.USE_STATIC_DATA) {
      return {
        id: "co1",
        companyName: "Legal Eagle Demo",
        address: "Dubai, UAE",
        phone: "+971 4 000 0000",
        email: "info@demo.local",
        currency: "AED",
        tax: 5,
        taxName: "VAT",
        invoicePrefix: "INV",
        dueDate: 30,
        timeZone: "GMT+04:00",
      }
    }
    const res = await axiosClient.get("/api/util/company/info")
    return res.data?.data ?? res.data ?? {}
  },

  async updateCompany(companyId: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.post("/api/util/edit/company", data, { params: { companyId } })
  },

  async getPracticeAreas() {
    if (env.USE_STATIC_DATA) return staticLookups.practiceAreas
    const res = await axiosClient.get("/api/practicearea/get", { params: { fetchtype: "all" } })
    return res.data?.data ?? []
  },

  async getLeadSources() {
    if (env.USE_STATIC_DATA) return staticLookups.leadSources
    const res = await axiosClient.get("/api/util/get/source/master", { params: { status: "Active" } })
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

  async getLocations() {
    if (env.USE_STATIC_DATA) return STATIC_LOCATIONS
    const r = await axiosClient.get("/api/hearing/list/location")
    return r.data?.data ?? r.data ?? []
  },

  async createLocation(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return { id: `loc-${Date.now()}`, ...data } }
    const r = await axiosClient.post("/api/hearing/add/location", data)
    return r.data?.data ?? r.data
  },

  async editLocation(id: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/hearing/edit/location", data, { params: { id } })
  },

  async deleteLocation(id: string) {
    // LMS toggles status via edit — soft-deactivate
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/hearing/edit/location", { status: "Inactive" }, { params: { id } })
  },

  async getSetupInfo() {
    if (env.USE_STATIC_DATA) return { totalLeads: 3, totalMatters: 3, totalClients: 2, totalInvoices: 3, totalUsers: 4, totalGroups: 2 }
    const r = await axiosClient.get("/api/dashboard/get/setup")
    return r.data?.data ?? r.data ?? {}
  },
}
