import { http, HttpResponse } from 'msw'
const BASE = 'https://testapi.alshamsilegallms.com'

export const miscHandlers = [
  // Lookups
  http.get(`${BASE}/api/practice-area/get`,     () => HttpResponse.json({ data:[{id:'pa1',name:'Corporate'},{id:'pa2',name:'Family Law'},{id:'pa3',name:'Commercial'},{id:'pa4',name:'Litigation'}] })),
  http.get(`${BASE}/api/lead-source/get`,        () => HttpResponse.json({ data:[{id:'ls1',name:'Referral'},{id:'ls2',name:'Website'},{id:'ls3',name:'LinkedIn'},{id:'ls4',name:'Cold Call'}] })),
  http.get(`${BASE}/api/util/list/department`,   () => HttpResponse.json({ data:[{id:'d1',name:'Litigation'},{id:'d2',name:'Corporate'},{id:'d3',name:'Family Law'}] })),
  http.get(`${BASE}/api/util/get/designation`,   () => HttpResponse.json({ data:[{id:'dg1',name:'Partner'},{id:'dg2',name:'Associate'},{id:'dg3',name:'Paralegal'},{id:'dg4',name:'Trainee'}] })),
  http.get(`${BASE}/api/session-rate/get`,       () => HttpResponse.json({ data:[{id:'sr1',name:'Standard (AED 500/hr)'},{id:'sr2',name:'Senior (AED 800/hr)'}] })),
  http.get(`${BASE}/api/location/get`,           () => HttpResponse.json({ data:[{id:'loc1',name:'Dubai Courts'},{id:'loc2',name:'ADGM'},{id:'loc3',name:'DIFC Courts'}] })),

  // Notifications
  http.get(`${BASE}/api/notification/get`, () =>
    HttpResponse.json({ data:[
      { id:'n1', title:'New Lead Assigned', message:'Mohammed Al Rashid has been assigned to you', read:false, createdAt:new Date(Date.now()-3600000).toISOString(), notificationType:'LEAD' },
      { id:'n2', title:'Invoice Overdue',   message:'INV-2025-003 is 15 days overdue',             read:false, createdAt:new Date(Date.now()-86400000).toISOString(), notificationType:'BILLING' },
      { id:'n3', title:'Task Due Today',    message:'Review Harper employment agreement',           read:true,  createdAt:new Date(Date.now()-172800000).toISOString(), notificationType:'TASK' },
    ]})
  ),
  http.put(`${BASE}/api/notification/read/all`,    () => HttpResponse.json({ data:{ message:'All read' } })),
  http.put(`${BASE}/api/notification/read/:id`,    () => HttpResponse.json({ data:{ message:'Marked read' } })),

  // LFA
  http.get(`${BASE}/api/lfa/filter/page`, () =>
    HttpResponse.json({ data:{ content:[
      { id:'lfa1', agreementNo:'LFA-2025-001', lfaTitle:'Al Rashid General Agreement', billingType:'Fixed', fixedBillingAmount:50000, current:true, agreementDate:'2025-01-01' },
      { id:'lfa2', agreementNo:'LFA-2025-002', lfaTitle:'Harper Hourly Agreement',     billingType:'Hourly', contingent:null, current:true, agreementDate:'2025-02-01' },
    ], totalElements:2, totalPages:1 }})
  ),
  http.get(`${BASE}/api/lfa/get/client`, () => HttpResponse.json({ data:[] })),
  http.get(`${BASE}/api/lfa/get/default`, () => HttpResponse.json({ data:[] })),
  http.post(`${BASE}/api/lfa/add`, () => HttpResponse.json({ data:{ id:'lfa-new', message:'LFA created' } })),

  // Tasks
  http.get(`${BASE}/api/task/get/all`, () =>
    HttpResponse.json({ data:{ content:[
      { id:'t1', taskName:'Review corporate agreement',      priority:'High',   taskStatus:'Pending',    taskDeadLine:'2025-06-20', assignedTo:{id:'u1',firstName:'Sarah',lastName:'Johnson'} },
      { id:'t2', taskName:'File court documents',           priority:'Normal', taskStatus:'In_Progress', taskDeadLine:'2025-06-25', assignedTo:{id:'u2',firstName:'James',lastName:'Williams'} },
      { id:'t3', taskName:'Client onboarding — KM Properties', priority:'Low', taskStatus:'Completed',  taskDeadLine:'2025-06-10', assignedTo:{id:'u3',firstName:'Priya',lastName:'Sharma'} },
    ], totalElements:3, totalPages:1 }})
  ),
  http.post(`${BASE}/api/task/add`,  () => HttpResponse.json({ data:{ id:'t-new', message:'Task created' } })),
  http.post(`${BASE}/api/task/edit`, () => HttpResponse.json({ data:{ message:'Task updated' } })),
  http.get(`${BASE}/api/task/get/type/approval`, () => HttpResponse.json({ data:[] })),

  // Reports (return empty pages — no mock data needed, stories test the container)
  http.get(`${BASE}/api/report/wip-reports/fee-earners`,     () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.post(`${BASE}/api/report/matter/billing/v2`,          () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.get(`${BASE}/api/report/fee-earners/util-report`,     () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.post(`${BASE}/api/report/fee-earners/revenues`,       () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.get(`${BASE}/api/report/get/me-report-cache`,         () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.get(`${BASE}/api/report/activity/history`,            () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),
  http.get(`${BASE}/api/report/department/billing/v2`,       () => HttpResponse.json({ data:{ content:[], totalElements:0, totalPages:0 } })),

  // Stopwatch
  http.get(`${BASE}/api/activity/stopwatch/info`, () => HttpResponse.json({ data:{ activityTimerStatus:'Idle' } })),
  http.post(`${BASE}/api/activity/stopwatch`,     () => HttpResponse.json({ data:{ message:'Stopwatch updated' } })),

  // OneDrive
  http.post(`${BASE}/api/onedrive/folder/register`, () => HttpResponse.json({ data:{ message:'Folder registered' } })),
  http.get(`${BASE}/api/onedrive/folder/get`,        () => HttpResponse.json({ data:[] })),
]
