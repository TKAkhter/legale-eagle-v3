import { http, HttpResponse } from 'msw'
const BASE = 'https://testapi.alshamsilegallms.com'

const MATTERS = [
  { id:'m1', title:'Al Rashid Holdings — Corporate Restructuring', matterSequence:'MAT-001', billingType:'Fixed',   status:'Open',   client:{id:'c1',companyName:'Al Rashid Holdings'}, responsibleAttorney:{id:'u1',firstName:'Sarah',lastName:'Johnson'},  department:{id:'d1',name:'Litigation'}, openDate:'2025-01-20', caseNo:'CR-2025-001' },
  { id:'m2', title:'Harper — Employment Dispute',                  matterSequence:'MAT-002', billingType:'Hourly',  status:'Open',   client:{id:'c2',firstName:'Emily',lastName:'Harper'},            responsibleAttorney:{id:'u2',firstName:'James', lastName:'Williams'}, department:{id:'d2',name:'Corporate'}, openDate:'2025-02-14', caseNo:'ED-2025-012' },
  { id:'m3', title:'KM Properties — Tenancy Agreement Review',     matterSequence:'MAT-003', billingType:'Session', status:'Closed', client:{id:'c3',companyName:'KM Properties'},         responsibleAttorney:{id:'u1',firstName:'Sarah',lastName:'Johnson'},  department:{id:'d1',name:'Litigation'}, openDate:'2025-03-01', caseNo:'TA-2025-007' },
]

export const matterHandlers = [
  http.post(`${BASE}/api/report/matter/mini/filter/page/v2`, () =>
    HttpResponse.json({ data: { content: MATTERS, totalElements: MATTERS.length, totalPages:1, number:0, size:25 } })
  ),
  http.post(`${BASE}/api/matter/get/by/id`, ({ request }) => {
    const url = new URL(request.url)
    const id  = url.searchParams.get('matterId')
    const m   = MATTERS.find(x => x.id === id) ?? MATTERS[0]
    return HttpResponse.json({ data: m })
  }),
  http.get(`${BASE}/api/matter/get/short-info`, () =>
    HttpResponse.json({ content: MATTERS.map(m=>({ id:m.id, title:m.title, matterSequence:m.matterSequence })) })
  ),
  http.post(`${BASE}/api/matter/add`,   () => HttpResponse.json({ data:{ id:'m-new', message:'Matter opened' } })),
  http.post(`${BASE}/api/matter/edit`,  () => HttpResponse.json({ data:{ message:'Matter updated' } })),
  http.post(`${BASE}/api/matter/close`, () => HttpResponse.json({ data:{ message:'Matter closed' } })),

  http.get(`${BASE}/api/hearing/monthly-all`, () =>
    HttpResponse.json({ data:[
      { id:'h1', caseNo:'CR-2025-001', matterTitle:'Corporate Restructuring', hearingDate:'2025-06-15', hearingTime:'10:00', status:'Scheduled' },
    ]})
  ),
  http.post(`${BASE}/api/hearing/add`,  () => HttpResponse.json({ data:{ message:'Hearing scheduled' } })),

  http.get(`${BASE}/api/conflict/check/multiple/mini/v2`, () =>
    HttpResponse.json({ data:[] })
  ),
  http.post(`${BASE}/api/conflict/check/multiple/mini/v2`, () =>
    HttpResponse.json({ data:[{ name:'Test Party', conflictStatus:'No Conflict', existingClient:false }] })
  ),
]
