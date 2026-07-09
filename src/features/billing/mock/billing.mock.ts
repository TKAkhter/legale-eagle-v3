import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const I = [
  { id:"inv1", invoiceNo:"INV-2025-001", matter:{id:"m1",title:"Al Rashid"}, client:{id:"c1",companyName:"Al Rashid Holdings"}, billingType:"Fixed", amount:15000, vatAmount:750, taxableAmount:15750, paidAmount:15750, balanceAmount:0, invoiceStatus:"Paid", issueDate:"2025-03-01", dueDate:"2025-03-31" },
  { id:"inv2", invoiceNo:"INV-2025-002", matter:{id:"m2",title:"Harper"}, client:{id:"c2",firstName:"Emily",lastName:"Harper"}, billingType:"Hourly", amount:8500, vatAmount:425, taxableAmount:8925, paidAmount:4000, balanceAmount:4925, invoiceStatus:"Partially_Paid", issueDate:"2025-04-01", dueDate:"2025-04-30" },
  { id:"inv3", invoiceNo:"INV-2025-003", matter:{id:"m1",title:"Al Rashid"}, client:{id:"c1",companyName:"Al Rashid Holdings"}, billingType:"Fixed", amount:5000, vatAmount:250, taxableAmount:5250, paidAmount:0, balanceAmount:5250, invoiceStatus:"Overdue", issueDate:"2025-02-01", dueDate:"2025-02-28" },
]
export const billingMockHandlers = [
  http.post(`${B}/api/invoice/filter/all/v2`, ()=>HttpResponse.json({data:{content:I,totalElements:I.length,totalPages:1,number:0,size:25}})),
  http.get(`${B}/api/invoice/get/by/id`,      ({request})=>{ const id=new URL(request.url).searchParams.get("invoiceId"); return HttpResponse.json({data:I.find(x=>x.id===id)??I[0]}) }),
  http.post(`${B}/api/invoice/add`,           ()=>HttpResponse.json({data:{id:"inv-new"}})),
  http.post(`${B}/api/invoice/pay`,           ()=>HttpResponse.json({data:{message:"Payment recorded"}})),
  http.post(`${B}/api/invoice/send/email`,    ()=>HttpResponse.json({data:{message:"Email sent"}})),
  http.get(`${B}/api/invoice/convert/pdf`,    ()=>new HttpResponse(new Blob(["%PDF mock"],{type:"application/pdf"}))),
  http.get(`${B}/api/invoice/convert/word`,   ()=>new HttpResponse(new Blob(["mock"],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}))),
  http.post(`${B}/api/report/activity/filter/m/v3`, ()=>HttpResponse.json({data:{content:[],totalElements:0}})),
]
