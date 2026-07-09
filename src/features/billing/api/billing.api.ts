import { axiosClient, axiosBlob } from "@lib/api/axios"
import type { GridParams } from "@/types"
import type { Invoice, CreateInvoiceDto } from "./billing.types"
export const billingApi = {
  async getAll(p: GridParams) { const res=await axiosClient.post("/api/invoice/filter/all/v2",{},{params:{pageNumber:p.page,pageSize:p.pageSize,clientId:p.filters.clientId??"",invoiceStatus:p.filters.invoiceStatus??"All",fromDate:p.filters.fromDate??"",toDate:p.filters.toDate??""}}); const d=res.data?.data??res.data; return {content:d.content??[],totalElements:d.totalElements??0,totalPages:d.totalPages??0,number:d.number??0,size:d.size??p.pageSize,first:d.first??true,last:d.last??true,empty:d.empty??true} },
  async getById(invoiceId: string): Promise<Invoice> { const res=await axiosClient.get("/api/invoice/get/by/id",{params:{invoiceId}}); return res.data?.data??res.data },
  async create(dto: CreateInvoiceDto): Promise<{id:string}> { const res=await axiosClient.post("/api/invoice/add",{matter:{id:dto.matterId},lfa:dto.lfaId?{id:dto.lfaId}:undefined,issueDate:dto.issueDate,dueDate:dto.dueDate,tax:dto.tax,discount:dto.discount,notes:dto.notes,activityIds:dto.activityIds}); return {id:res.data?.data?.id??""} },
  async recordPayment(invoiceId:string,amount:number,paymentDate:string,paymentMode:string,referenceNo:string): Promise<void> { await axiosClient.post("/api/invoice/pay",{invoiceId,amount,paymentDate,paymentMode,referenceNo}) },
  async sendEmail(invoiceId: string): Promise<void> { await axiosClient.post("/api/invoice/send/email",null,{params:{invoiceId}}) },
  async downloadPdf(invoiceId: string): Promise<Blob> { const res=await axiosBlob.get("/api/invoice/convert/pdf",{params:{invoiceId}}); return res.data as Blob },
  async downloadWord(invoiceId: string): Promise<Blob> { const res=await axiosBlob.get("/api/invoice/convert/word",{params:{invoiceId}}); return res.data as Blob },
}
