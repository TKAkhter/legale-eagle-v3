import { env }         from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { auth as staticAuth } from "@/data/static"

export const authApi = {
  async signin(username: string, password: string): Promise<Record<string,unknown>> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 350))
      if (username !== staticAuth.credentials.email || password !== staticAuth.credentials.password)
        throw Object.assign(new Error("Invalid credentials"), { response: { data: { message: "Invalid email or password" } } })
      return { ...staticAuth.user, role:[{id:"r1",roleName:"ROLE_SUB_ADMIN"}], token: staticAuth.user.token, oneDrive:true, company:{id:"6465b4c27e06f92d902b4ed3",companyName:"Legal Eagle LMS",currency:"AED",tax:5,taxName:"VAT",oneDrive:true,autoLogout:false,autoLogoutMin:2}, department:staticAuth.user.department, cloneUser:false, cloneFromUserId:null, cloneFromUserName:null }
    }
    const res = await axiosClient.post("/api/auth/signin", { username, password })
    return res.data
  },

  async getMenu(token: string): Promise<unknown[]> {
    if (env.USE_STATIC_DATA) return staticAuth.menu
    const res = await axiosClient.get("/api/user/get/access/menu", { headers: { Authorization: `Bearer ${token}` } })
    return res.data?.data ?? []
  },

  async getGroups(token: string): Promise<unknown[]> {
    if (env.USE_STATIC_DATA) return staticAuth.groups
    const res = await axiosClient.get("/api/group/get", { headers: { Authorization: `Bearer ${token}` } })
    return res.data?.data ?? []
  },

  async getNotifications(token: string): Promise<unknown[]> {
    if (env.USE_STATIC_DATA) return staticAuth.notifications
    const res = await axiosClient.get("/api/util/get/notification", { headers: { Authorization: `Bearer ${token}` } })
    return res.data?.data ?? []
  },

  async resetPassword(email: string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/auth/reset/password", { username: email })
  },

  async changePassword(old: string, next: string, confirm: string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.post("/api/user/change/password", { oldPassword: old, newPassword: next, confirmPassword: confirm })
  },

  async checkSession(): Promise<void> {
    if (env.USE_STATIC_DATA) return
    await axiosClient.get("/api/user/check/session").catch(() => {})
  },
  async updateProfile(data: { firstName: string; lastName: string }): Promise<void> {
    /** Update user display name */
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)); return }
    await axiosClient.put("/api/user/update", data)
  },

  async uploadAvatar(file: File): Promise<string> {
    /** Upload avatar image, returns the new URL */
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 600))
      return URL.createObjectURL(file)
    }
    const form = new FormData()
    form.append("file", file)
    const r = await axiosClient.post("/api/user/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" }
    })
    return r.data?.data?.url ?? r.data?.url ?? ""
  },

}