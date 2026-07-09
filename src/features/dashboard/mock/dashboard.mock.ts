import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
export const dashboardMockHandlers = [
  http.get(`${B}/api/dashboard/lead/count`,   ()=>HttpResponse.json({data:{totalLeads:42,openLeads:18}})),
  http.get(`${B}/api/dashboard/matter/count`, ()=>HttpResponse.json({data:{totalMatters:31,openMatters:19}})),
  http.get(`${B}/api/dashboard/task/count`,   ()=>HttpResponse.json({data:{pendingTasks:7,overdueTasks:2}})),
  http.get(`${B}/api/analytics/graph/matters-history-monthly`, ()=>HttpResponse.json({data:[{month:"Jan",count:4},{month:"Feb",count:6},{month:"Mar",count:9}]})),
  http.get(`${B}/api/analytics/graph/fixedfees-timelogs-revenue`, ()=>HttpResponse.json({data:[{month:"Jan",fixedFees:35000,timelogs:12000},{month:"Feb",fixedFees:28000,timelogs:15000}]})),
  http.get(`${B}/api/analytics/graph/timelogs-summary-per-category`, ()=>HttpResponse.json({data:[{category:"Litigation",hours:120},{category:"Corporate",hours:85}]})),
  http.get(`${B}/api/analytics/dashboard/my-upcoming-hearing-today-and-tomorrow`, ()=>HttpResponse.json({data:[{caseNo:"CR-2025-001",matterTitle:"Al Rashid",hearingDate:"Today",hearingTime:"10:00 AM"}]})),
  http.get(`${B}/api/dashboard/get/setup`, ()=>HttpResponse.json({data:[]})),
  http.post(`${B}/api/dashboard/setup`, ()=>HttpResponse.json({data:{message:"Saved"}})),
]
