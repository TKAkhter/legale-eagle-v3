import { http, HttpResponse } from 'msw'
const BASE = 'https://testapi.alshamsilegallms.com'

export const dashboardHandlers = [
  http.get(`${BASE}/api/dashboard/lead/count`,   () => HttpResponse.json({ data:{ totalLeads:42, openLeads:18, closedLeads:24 } })),
  http.get(`${BASE}/api/dashboard/matter/count`, () => HttpResponse.json({ data:{ totalMatters:31, openMatters:19, closedMatters:12 } })),
  http.get(`${BASE}/api/dashboard/task/count`,   () => HttpResponse.json({ data:{ pendingTasks:7, overdueTasks:2, completedTasks:15 } })),

  http.get(`${BASE}/api/analytics/graph/matters-history-monthly`, () =>
    HttpResponse.json({ data:[
      { month:'Jan', count:4 }, { month:'Feb', count:6 }, { month:'Mar', count:5 },
      { month:'Apr', count:8 }, { month:'May', count:7 }, { month:'Jun', count:9 },
    ]})
  ),
  http.get(`${BASE}/api/analytics/graph/fixedfees-timelogs-revenue`, () =>
    HttpResponse.json({ data:[
      { month:'Jan', fixedFees:35000, timelogs:12000 },
      { month:'Feb', fixedFees:28000, timelogs:15000 },
      { month:'Mar', fixedFees:42000, timelogs:18000 },
      { month:'Apr', fixedFees:38000, timelogs:14000 },
      { month:'May', fixedFees:55000, timelogs:22000 },
      { month:'Jun', fixedFees:48000, timelogs:19000 },
    ]})
  ),
  http.get(`${BASE}/api/analytics/graph/timelogs-summary-per-category`, () =>
    HttpResponse.json({ data:[
      { category:'Litigation', hours:120 },
      { category:'Corporate', hours:85 },
      { category:'Advisory', hours:60 },
      { category:'Drafting', hours:45 },
    ]})
  ),
  http.get(`${BASE}/api/analytics/dashboard/my-upcoming-hearing-today-and-tomorrow`, () =>
    HttpResponse.json({ data:[
      { caseNo:'CR-2025-001', matterTitle:'Al Rashid — Corporate Restructuring', hearingDate:'Today', hearingTime:'10:00 AM' },
      { caseNo:'ED-2025-012', matterTitle:'Harper — Employment Dispute', hearingDate:'Tomorrow', hearingTime:'02:30 PM' },
    ]})
  ),
  http.get(`${BASE}/api/dashboard/get/setup`, () =>
    HttpResponse.json({ data:[
      { name:'KPI_CARDS', seq:0, visible:true },
      { name:'MATTER_ACTIVITY', seq:1, visible:true },
      { name:'REVENUE_BREAKDOWN', seq:2, visible:true },
      { name:'TIMELOG_CATEGORIES', seq:3, visible:true },
      { name:'UPCOMING_HEARINGS', seq:4, visible:true },
    ]})
  ),
  http.post(`${BASE}/api/dashboard/setup`, () => HttpResponse.json({ data:{ message:'Layout saved' } })),
]
