import { axiosClient } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { LfaItem, CreateLfaDto } from "./lfa.types"
export const lfaApi = {
  async getAll(p: GridParams) { const res=await axiosClient.get("/api/lfa/filter/page",{params:{pageNumber:p.page,pageSize:p.pageSize,clientId:p.filters.clientId??"",billingType:p.filters.billingType??""}}); const d=res.data?.data??res.data; return {content:d.content??[],totalElements:d.totalElements??0,totalPages:d.totalPages??0,number:d.number??0,size:d.size??p.pageSize,first:d.first??true,last:d.last??true,empty:d.empty??true} },
  async getById(lfaId: string): Promise<LfaItem> { const res=await axiosClient.get("/api/lfa/get/full",{params:{lfaId}}); return res.data?.data??res.data },
  async create(dto: CreateLfaDto): Promise<void> { await axiosClient.post("/api/lfa/add",dto) },
  async update(lfaId: string, dto: Partial<CreateLfaDto>): Promise<void> { await axiosClient.post("/api/lfa/edit",{lfaId,...dto}) },
  async approve(lfaId: string, status: "Approved"|"Canceled"): Promise<void> { await axiosClient.patch(`/api/lfa/approve/${lfaId}/${status}`) },
}
