import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
export const lfaMockHandlers = [
  http.get(`${B}/api/lfa/filter/page`, ()=>HttpResponse.json({data:{content:[{id:"lfa1",agreementNo:"LFA-001",lfaTitle:"Al Rashid General",billingType:"Fixed",fixedBillingAmount:50000,current:true,agreementDate:"2025-01-01"}],totalElements:1,totalPages:1,number:0,size:25}})),
  http.get(`${B}/api/lfa/get/full`, ()=>HttpResponse.json({data:{id:"lfa1",agreementNo:"LFA-001",billingType:"Fixed",fixedBillingAmount:50000,current:true}})),
  http.get(`${B}/api/lfa/get/client`, ()=>HttpResponse.json({data:[]})),
  http.get(`${B}/api/lfa/get/default`, ()=>HttpResponse.json({data:[]})),
  http.post(`${B}/api/lfa/add`, ()=>HttpResponse.json({data:{id:"lfa-new"}})),
  http.post(`${B}/api/lfa/edit`, ()=>HttpResponse.json({data:{message:"Updated"}})),
  http.patch(/api\/lfa\/approve/, ()=>HttpResponse.json({data:{message:"Status updated"}})),
  http.get(`${B}/api/lfa/approval/list`, ()=>HttpResponse.json({data:[]})),
]
