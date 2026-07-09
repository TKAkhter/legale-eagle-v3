import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const LEADS = [
  { id:"l1", firstName:"Mohammed", lastName:"Al Rashid", companyName:"Al Rashid Holdings", leadType:"COMPANY", currentStatus:"NEW", createdAt:"2025-01-15", practiceArea:{id:"pa1",name:"Corporate"}, emails:[{emailId:"m@holdings.ae"}], phones:[{phoneNo:"+971501234567"}] },
  { id:"l2", firstName:"Fatima",   lastName:"Khalid",    companyName:"",                  leadType:"PERSON",  currentStatus:"FOLLOW_UP", createdAt:"2025-02-10", practiceArea:{id:"pa2",name:"Family Law"}, emails:[{emailId:"fatima@gmail.com"}], phones:[{phoneNo:"+971509876543"}] },
  { id:"l3", firstName:"Robert",   lastName:"Chen",      companyName:"Chen Enterprises",  leadType:"COMPANY", currentStatus:"PROPOSAL",  createdAt:"2025-03-22", practiceArea:{id:"pa3",name:"Commercial"}, emails:[{emailId:"r@chen.com"}], phones:[{phoneNo:"+971555123456"}] },
]
export const leadsMockHandlers = [
  http.get(`${B}/api/leads/list/filter`,    () => HttpResponse.json({ data:{ content:LEADS, totalElements:LEADS.length, totalPages:1, number:0, size:25 } })),
  http.get(`${B}/api/leads/get/single`,     ({ request }) => { const id=new URL(request.url).searchParams.get("leadId"); return HttpResponse.json({ data: LEADS.find(l=>l.id===id)??LEADS[0] }) }),
  http.get(`${B}/api/leads/get/followup`,   () => HttpResponse.json({ data:[{ id:"f1", followUpContent:"Initial consultation", followUpTime:"2025-01-20", createdAt:"2025-01-20" }] })),
  http.post(`${B}/api/leads/add`,           () => HttpResponse.json({ data:{ id:"l-new" } })),
  http.post(`${B}/api/leads/edit`,          () => HttpResponse.json({ data:{ message:"Updated" } })),
  http.post(`${B}/api/leads/convert`,       () => HttpResponse.json({ data:{ message:"Converted" } })),
  http.post(`${B}/api/leads/add/followup`,  () => HttpResponse.json({ data:{ message:"Added" } })),
  http.post(`${B}/api/leads/get/lead/writeoff`, () => HttpResponse.json({ data:{ message:"Written off" } })),
]
