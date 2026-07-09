import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
export const tasksMockHandlers = [
  http.get(`${B}/api/task/get/all`, ()=>HttpResponse.json({data:{content:[{id:"t1",taskName:"Review agreement",priority:"High",taskStatus:"Pending",taskDeadLine:"2025-06-20"}],totalElements:1,totalPages:1,number:0,size:25}})),
  http.get(`${B}/api/task/get/type/approval`, ()=>HttpResponse.json({data:[]})),
  http.post(`${B}/api/task/add`, ()=>HttpResponse.json({data:{id:"t-new"}})),
  http.post(`${B}/api/task/edit`, ()=>HttpResponse.json({data:{message:"Updated"}})),
  http.post(`${B}/api/task/approve`, ()=>HttpResponse.json({data:{message:"Approved"}})),
]
