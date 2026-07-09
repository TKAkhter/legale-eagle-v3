import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
export const timelogsMockHandlers = [
  http.get(`${B}/api/activity/for-approval/by-user/v2`, ()=>HttpResponse.json({data:{content:[],totalElements:0,totalPages:0,number:0,size:25}})),
  http.get(`${B}/api/activity/for-approval`, ()=>HttpResponse.json({data:{content:[],totalElements:0,totalPages:0,number:0,size:25}})),
  http.post(`${B}/api/activity/add/v2`, ()=>HttpResponse.json({data:{id:"act-new"}})),
  http.post(`${B}/api/activity/approve`, ()=>HttpResponse.json({data:{message:"Approved"}})),
  http.post(`${B}/api/activity/send/for/approval/to-attorney/v2`, ()=>HttpResponse.json({data:{message:"Submitted"}})),
  http.get(`${B}/api/activity/stopwatch/info`, ()=>HttpResponse.json({data:{activityTimerStatus:"Idle"}})),
  http.post(`${B}/api/activity/stopwatch`, ()=>HttpResponse.json({data:{message:"Updated"}})),
]
