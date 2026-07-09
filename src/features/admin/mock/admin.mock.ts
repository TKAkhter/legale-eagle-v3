import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const USERS = [
  { id:"u1", firstName:"Sarah",  lastName:"Johnson",  email:"sarah@firm.com",  companyUserType:"ATTORNEY",    active:true,  department:{id:"d1",name:"Litigation"}, designation:{id:"dg1",name:"Partner"} },
  { id:"u2", firstName:"James",  lastName:"Williams", email:"james@firm.com",  companyUserType:"ATTORNEY",    active:true,  department:{id:"d1",name:"Litigation"}, designation:{id:"dg2",name:"Associate"} },
  { id:"u3", firstName:"Priya",  lastName:"Sharma",   email:"priya@firm.com",  companyUserType:"NONATTORNEY", active:true,  department:{id:"d2",name:"Corporate"},  designation:{id:"dg3",name:"Paralegal"} },
]
export const adminMockHandlers = [
  http.get(`${B}/api/user/get`, ()=>HttpResponse.json({data:{content:USERS,totalElements:USERS.length,totalPages:1,number:0,size:25}})),
  http.get(`${B}/api/user/get/min`, ()=>HttpResponse.json({data:USERS.map(u=>({id:u.id,firstName:u.firstName,lastName:u.lastName}))})),
  http.get(`${B}/api/user/get/by/id`, ({request})=>{ const id=new URL(request.url).searchParams.get("userId"); return HttpResponse.json({data:USERS.find(u=>u.id===id)??USERS[0]}) }),
  http.post(`${B}/api/user/sendRequest`, ()=>HttpResponse.json({data:{message:"Invitation sent"}})),
  http.post(`${B}/api/user/edit`, ()=>HttpResponse.json({data:{message:"Updated"}})),
  http.put(`${B}/api/user/block/:id`, ()=>HttpResponse.json({data:{message:"Status updated"}})),
  http.post(`${B}/api/user/change/password/admin`, ()=>HttpResponse.json({data:{message:"Password reset"}})),
  http.put(`${B}/api/user/extra/permission/:id`, ()=>HttpResponse.json({data:{message:"Permissions updated"}})),
  http.post(`${B}/api/group/add`, ()=>HttpResponse.json({data:{id:"g-new"}})),
  http.post(`${B}/api/group/add/individual/permission`, ()=>HttpResponse.json({data:{message:"Saved"}})),
  http.get(`${B}/api/util/list/department`, ()=>HttpResponse.json({data:[{id:"d1",name:"Litigation"},{id:"d2",name:"Corporate"}]})),
  http.get(`${B}/api/util/get/designation`, ()=>HttpResponse.json({data:[{id:"dg1",name:"Partner"},{id:"dg2",name:"Associate"}]})),
  http.get(`${B}/api/practice-area/get`, ()=>HttpResponse.json({data:[{id:"pa1",name:"Corporate"},{id:"pa2",name:"Family Law"}]})),
  http.get(`${B}/api/lead-source/get`, ()=>HttpResponse.json({data:[{id:"ls1",name:"Referral"},{id:"ls2",name:"Website"}]})),
  http.get(`${B}/api/session-rate/get`, ()=>HttpResponse.json({data:[{id:"sr1",name:"Standard (AED 500/hr)"}]})),
  http.get(`${B}/api/notification/get`, ()=>HttpResponse.json({data:[{id:"n1",title:"New Lead",message:"Mohammed assigned",read:false,createdAt:new Date(Date.now()-3600000).toISOString()},{id:"n2",title:"Invoice Overdue",message:"INV-003 is overdue",read:true,createdAt:new Date(Date.now()-86400000).toISOString()}]})),
  http.put(`${B}/api/notification/read/all`, ()=>HttpResponse.json({data:{message:"All read"}})),
  http.put(`${B}/api/notification/read/:id`, ()=>HttpResponse.json({data:{message:"Read"}})),
  http.post(`${B}/api/onedrive/folder/register`, ()=>HttpResponse.json({data:{message:"Registered"}})),
  http.get(`${B}/api/onedrive/folder/get`, ()=>HttpResponse.json({data:[]})),
  http.get(`${B}/api/location/get`, ()=>HttpResponse.json({data:[{id:"loc1",name:"Dubai Courts"}]})),
]
