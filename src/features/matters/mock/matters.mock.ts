import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const M = [
  { id:"m1", title:"Al Rashid — Corporate Restructuring", matterSequence:"MAT-001", billingType:"Fixed", status:"Open", client:{id:"c1",companyName:"Al Rashid Holdings"}, responsibleAttorney:{id:"u1",firstName:"Sarah",lastName:"Johnson"}, department:{id:"d1",name:"Litigation"}, openDate:"2025-01-20", caseNo:"CR-2025-001" },
  { id:"m2", title:"Harper — Employment Dispute", matterSequence:"MAT-002", billingType:"Hourly", status:"Open", client:{id:"c2",firstName:"Emily",lastName:"Harper"}, responsibleAttorney:{id:"u2",firstName:"James",lastName:"Williams"}, department:{id:"d2",name:"Corporate"}, openDate:"2025-02-14", caseNo:"ED-2025-012" },
]
export const mattersMockHandlers = [
  http.post(`${B}/api/report/matter/mini/filter/page/v2`, ()=>HttpResponse.json({data:{content:M,totalElements:M.length,totalPages:1,number:0,size:25}})),
  http.post(`${B}/api/matter/get/by/id`, ({request})=>{ const id=new URL(request.url).searchParams.get("matterId"); return HttpResponse.json({data:M.find(x=>x.id===id)??M[0]}) }),
  http.get(`${B}/api/matter/get/short-info`, ()=>HttpResponse.json({content:M.map(x=>({id:x.id,title:x.title}))})),
  http.post(`${B}/api/matter/add`,  ()=>HttpResponse.json({data:{id:"m-new"}})),
  http.post(`${B}/api/matter/edit`, ()=>HttpResponse.json({data:{message:"Updated"}})),
  http.post(`${B}/api/matter/close`,()=>HttpResponse.json({data:{message:"Closed"}})),
  http.get(`${B}/api/hearing/monthly-all`, ()=>HttpResponse.json({data:[]})),
  http.post(`${B}/api/hearing/add`, ()=>HttpResponse.json({data:{message:"Scheduled"}})),
  http.post(`${B}/api/conflict/check/multiple/mini/v2`, ()=>HttpResponse.json({data:[{name:"Test",conflictStatus:"No Conflict"}]})),
]
