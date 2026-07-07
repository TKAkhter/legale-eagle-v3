import { http, HttpResponse } from 'msw'
const BASE = 'https://testapi.alshamsilegallms.com'

const INVOICES = [
  { id:'inv1', invoiceNo:'INV-2025-001', matter:{id:'m1',title:'Al Rashid — Corporate Restructuring'}, client:{id:'c1',companyName:'Al Rashid Holdings'}, billingType:'Fixed',  amount:15000, vatAmount:750, taxableAmount:15750, paidAmount:15750, balanceAmount:0,     invoiceStatus:'Paid',    issueDate:'2025-03-01', dueDate:'2025-03-31' },
  { id:'inv2', invoiceNo:'INV-2025-002', matter:{id:'m2',title:'Harper — Employment Dispute'},         client:{id:'c2',firstName:'Emily',lastName:'Harper'},             billingType:'Hourly', amount:8500,  vatAmount:425,  taxableAmount:8925,  paidAmount:4000,  balanceAmount:4925,  invoiceStatus:'Partially_Paid', issueDate:'2025-04-01', dueDate:'2025-04-30' },
  { id:'inv3', invoiceNo:'INV-2025-003', matter:{id:'m1',title:'Al Rashid — Corporate Restructuring'}, client:{id:'c1',companyName:'Al Rashid Holdings'}, billingType:'Fixed',  amount:5000,  vatAmount:250,  taxableAmount:5250,  paidAmount:0,     balanceAmount:5250,  invoiceStatus:'Overdue', issueDate:'2025-02-01', dueDate:'2025-02-28' },
]

export const billingHandlers = [
  http.post(`${BASE}/api/invoice/filter/all/v2`, () =>
    HttpResponse.json({ data:{ content:INVOICES, totalElements:INVOICES.length, totalPages:1, number:0, size:25 } })
  ),
  http.get(`${BASE}/api/invoice/get/by/id`, ({ request }) => {
    const id  = new URL(request.url).searchParams.get('invoiceId')
    const inv = INVOICES.find(i => i.id === id) ?? INVOICES[0]
    return HttpResponse.json({ data: inv })
  }),
  http.post(`${BASE}/api/invoice/add`,            () => HttpResponse.json({ data:{ id:'inv-new', message:'Invoice created' } })),
  http.post(`${BASE}/api/invoice/pay`,            () => HttpResponse.json({ data:{ message:'Payment recorded' } })),
  http.post(`${BASE}/api/invoice/send/email`,     () => HttpResponse.json({ data:{ message:'Invoice emailed' } })),
  http.get(`${BASE}/api/invoice/convert/pdf`,     () => new HttpResponse(new Blob(['%PDF mock'], {type:'application/pdf'}), { status:200 })),
  http.get(`${BASE}/api/invoice/convert/word`,    () => new HttpResponse(new Blob(['mock docx'], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}), { status:200 })),

  http.get(`${BASE}/api/activity/for-approval`,    () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.get(`${BASE}/api/activity/for-approval/by-user/v2`, () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.post(`${BASE}/api/activity/add/v2`,         () => HttpResponse.json({ data:{ id:'act-new', message:'Activity logged' } })),
  http.post(`${BASE}/api/activity/approve`,        () => HttpResponse.json({ data:{ message:'Approved' } })),
  http.post(`${BASE}/api/activity/send/for/approval/to-attorney/v2`, () => HttpResponse.json({ data:{ message:'Submitted' } })),

  http.post(`${BASE}/api/report/activity/filter/m/v3`, () =>
    HttpResponse.json({ data:{ content:[
      { id:'act1', activity:'Review corporate documents', entryDate:'2025-05-10', totalHours:3.5, billing:1750, revenueStatus:'APPROVED', billable:true },
      { id:'act2', activity:'Client meeting — restructuring strategy', entryDate:'2025-05-12', totalHours:2, billing:1000, revenueStatus:'APPROVED', billable:true },
    ], totalElements:2, totalPages:1 }})
  ),
]
