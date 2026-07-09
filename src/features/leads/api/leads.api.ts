import { axiosClient } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { Lead, CreateLeadDto, LeadFollowup } from "./leads.types"

function toModel(r: Record<string,unknown>): Lead {
  return { id: String(r.id??""), firstName: r.firstName as string, lastName: r.lastName as string, companyName: r.companyName as string, leadType: (r.leadType as "PERSON"|"COMPANY")??"PERSON", currentStatus: String(r.currentStatus??""), email: (r.emails as {emailId:string}[])?.[0]?.emailId ?? r.email as string, phone: (r.phones as {phoneNo:string}[])?.[0]?.phoneNo ?? r.phone as string, practiceArea: r.practiceArea as Lead["practiceArea"], leadSource: r.leadSource as Lead["leadSource"], lawyer: r.lawyer as Lead["lawyer"], description: r.description as string, createdAt: r.createdAt as string }
}

export const leadsApi = {
  async getAll(p: GridParams) {
    const res = await axiosClient.get("/api/leads/list/filter", { params: { pageNumber: p.page, pageSize: p.pageSize, firstName: p.filters.searchText??"", currentStatus: p.filters.currentStatus??"" } })
    const d = res.data?.data ?? res.data
    return { content: (d.content??[]).map(toModel), totalElements: d.totalElements??0, totalPages: d.totalPages??0, number: d.number??0, size: d.size??p.pageSize, first: d.first??true, last: d.last??true, empty: d.empty??true }
  },
  async getById(id: string): Promise<Lead> { const res = await axiosClient.get("/api/leads/get/single", { params: { leadId: id } }); return toModel(res.data?.data??res.data) },
  async getFollowups(id: string): Promise<LeadFollowup[]> { const res = await axiosClient.get("/api/leads/get/followup", { params: { leadId: id } }); return res.data?.data??res.data??[] },
  async create(dto: CreateLeadDto): Promise<{ id: string }> { const res = await axiosClient.post("/api/leads/add", { ...dto, emails: dto.email?[{emailId:dto.email,type:"Work",primary:true}]:[], phones: dto.phone?[{phoneNo:dto.phone,type:"Mobile",primary:true}]:[], practiceArea: dto.practiceAreaId?{id:dto.practiceAreaId}:undefined, leadSource: dto.leadSourceId?{id:dto.leadSourceId}:undefined, lawyer: dto.lawyerId?{id:dto.lawyerId}:undefined }); return { id: res.data?.data?.id??res.data?.id??"" } },
  async update(leadId: string, dto: Partial<CreateLeadDto>): Promise<void> { await axiosClient.post("/api/leads/edit", { leadId, ...dto }) },
  async convert(leadId: string, matterTitle: string, billingType: string): Promise<void> { await axiosClient.post("/api/leads/convert", { leadId, matter: { title: matterTitle, billingType } }) },
  async addFollowup(leadId: string, data: { followUpContent: string; followUpTime: string; stageCompleted: boolean }): Promise<void> { await axiosClient.post("/api/leads/add/followup", { leadId, ...data, files: [] }) },
  async writeOff(leadId: string): Promise<void> { await axiosClient.post("/api/leads/get/lead/writeoff", { leadId }) },
}
