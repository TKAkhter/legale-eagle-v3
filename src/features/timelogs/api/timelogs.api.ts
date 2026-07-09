import { axiosClient } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { TimelogEntry, CreateActivityDto } from "./timelogs.types"
export const timelogsApi = {
  async getAll(p: GridParams) { const res=await axiosClient.get("/api/activity/for-approval/by-user/v2",{params:{pageNumber:p.page,pageSize:p.pageSize,revenueStatus:p.filters.revenueStatus??"DRAFT"}}); const d=res.data?.data??res.data; return {content:d.content??[],totalElements:d.totalElements??0,totalPages:d.totalPages??0,number:d.number??0,size:d.size??p.pageSize,first:d.first??true,last:d.last??true,empty:d.empty??true} },
  async create(dto: CreateActivityDto): Promise<void> { await axiosClient.post("/api/activity/add/v2",{activity:dto.activity,matter:{id:dto.matterId},activityType:dto.activityType,hours:dto.hours??0,minutes:dto.minutes??0,rate:dto.rate,billable:dto.billable,entryDate:dto.entryDate,responsiblePerson:dto.responsiblePersonId?{id:dto.responsiblePersonId}:undefined}) },
  async approve(activityIds: string[], status: "APPROVED"|"REJECTED"): Promise<void> { await axiosClient.post("/api/activity/approve",{activityIds,status}) },
}
