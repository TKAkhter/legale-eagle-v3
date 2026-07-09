import { axiosClient } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { Client, CreateClientDto, ClientShortInfo } from "./clients.types"
function toModel(r: Record<string,unknown>): Client { return { id:String(r.id??""), firstName:r.firstName as string, lastName:r.lastName as string, companyName:r.companyName as string, clientType:(r.clientType as "PERSON"|"COMPANY")??"PERSON", email:(r.email as {emailId:string}[])?.[0]?.emailId??r.email as string, phone:(r.phones as {phoneNo:string}[])?.[0]?.phoneNo??r.phone as string, trnNo:r.trnNo as string, nationality:r.nationality as string, referral:r.referral as boolean, referralName:r.referralName as string, active:r.active as boolean } }
export const clientsApi = {
  async getAll(p: GridParams) { const res=await axiosClient.get("/api/client/filter",{params:{pageNumber:p.page,pageSize:p.pageSize,searchText:p.filters.searchText??""}}); const d=res.data?.data??res.data; return {content:(d.content??[]).map(toModel),totalElements:d.totalElements??0,totalPages:d.totalPages??0,number:d.number??0,size:d.size??p.pageSize,first:d.first??true,last:d.last??true,empty:d.empty??true} },
  async getById(id: string): Promise<Client> { const res=await axiosClient.get(`/api/client/get/by/company/${id}`); return toModel(res.data?.data??res.data) },
  async search(q: string): Promise<ClientShortInfo[]> { const res=await axiosClient.get("/api/client/get/short-info",{params:{clientName:q,pageNumber:0,pageSize:50}}); return res.data?.content??res.data?.data?.content??[] },
  async create(dto: CreateClientDto): Promise<{id:string}> { const res=await axiosClient.post("/api/client/add",{...dto,email:dto.email?[{emailId:dto.email,type:"Work",primary:true}]:[],phones:dto.phone?[{phoneNo:dto.phone,type:"Mobile",codeNo:"+971",primary:true}]:[]}); return {id:res.data?.data?.id??""} },
  async update(clientId: string, dto: Partial<CreateClientDto>): Promise<void> { await axiosClient.post("/api/client/edit",{clientId,...dto}) },
}
