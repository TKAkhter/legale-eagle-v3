import { axiosClient } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { Task, CreateTaskDto } from "./tasks.types"
export const tasksApi = {
  async getAll(p: GridParams) { const res=await axiosClient.get("/api/task/get/all",{params:{pageNumber:p.page,pageSize:p.pageSize}}); const d=res.data?.data??res.data; return {content:d.content??[],totalElements:d.totalElements??0,totalPages:d.totalPages??0,number:d.number??0,size:d.size??p.pageSize,first:d.first??true,last:d.last??true,empty:d.empty??true} },
  async create(dto: CreateTaskDto): Promise<void> { await axiosClient.post("/api/task/add",{taskName:dto.taskName,eventType:dto.eventType,assignedTo:dto.assignedToId?{id:dto.assignedToId}:undefined,taskDeadLine:dto.taskDeadLine,priority:dto.priority,taskDescription:dto.taskDescription,requiresApproval:dto.requiresApproval}) },
  async approve(taskId: string, status: "Completed"|"Rejected"): Promise<void> { await axiosClient.post("/api/task/approve",{taskId,status}) },
}
