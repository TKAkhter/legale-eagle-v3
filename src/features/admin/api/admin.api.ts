import { axiosClient } from "@lib/api/axios"
export const adminApi = {
  async getUsers(p:{pageNumber:number;pageSize:number;searchText?:string;departmentId?:string}) { const res=await axiosClient.get("/api/user/get",{params:p}); return res.data?.data??res.data },
  async getUserById(userId:string) { const res=await axiosClient.get("/api/user/get/by/id",{params:{userId}}); return res.data?.data??res.data },
  async inviteUser(data:Record<string,unknown>) { await axiosClient.post("/api/user/sendRequest",data) },
  async updateUser(userId:string,data:Record<string,unknown>) { await axiosClient.post("/api/user/edit",{userId,...data}) },
  async blockUser(userId:string) { await axiosClient.put(`/api/user/block/${userId}`) },
  async resetPassword(userId:string,password:string) { await axiosClient.post("/api/user/change/password/admin",{userId,password}) },
  async getGroups() { const res=await axiosClient.get("/api/group/get"); return res.data?.data??res.data??[] },
  async createGroup(name:string) { await axiosClient.post("/api/group/add",{name}) },
  async savePermissions(groupId:string,permission:unknown[]) { await axiosClient.post("/api/group/add/individual/permission",{groupId,permission}) },
}
