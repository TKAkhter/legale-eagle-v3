import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const E = {content:[],totalElements:0,totalPages:0,number:0,size:25}
export const reportsMockHandlers = [
  http.get(`${B}/api/report/wip-reports/fee-earners`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/department/billing/v2`, ()=>HttpResponse.json({data:E})),
  http.post(`${B}/api/report/matter/billing/v2`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/fee-earners/util-report`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/activity/history`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/get/me-report-cache`, ()=>HttpResponse.json({data:E})),
  http.post(`${B}/api/report/fee-earners/revenues`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/lfa/billing/v2`, ()=>HttpResponse.json({data:E})),
  http.get(`${B}/api/report/lfa/referral`, ()=>HttpResponse.json({data:E})),
  http.post(`${B}/api/revenue/matter-erosion-activities-group-by-matter/generate-cache`, ()=>HttpResponse.json({data:{message:"Cache rebuilt"}})),
]
