import { http, HttpResponse } from 'msw'

const BASE = 'https://testapi.alshamsilegallms.com'

const LEADS = [
  { id: 'l1', firstName: 'Mohammed', lastName: 'Al Rashid', companyName: 'Al Rashid Holdings', leadType: 'COMPANY', currentStatus: 'NEW',        createdAt: '2025-01-15', practiceArea: { id:'pa1', name:'Corporate' },    leadSource: { id:'ls1', name:'Referral' },  lawyer: { id:'u1', firstName:'Sarah', lastName:'Johnson' }, emails:[{emailId:'m.alrashid@holdings.ae'}], phones:[{phoneNo:'+971501234567'}] },
  { id: 'l2', firstName: 'Fatima',   lastName: 'Khalid',    companyName: '',                    leadType: 'PERSON',  currentStatus: 'FOLLOW_UP',  createdAt: '2025-02-10', practiceArea: { id:'pa2', name:'Family Law' },   leadSource: { id:'ls2', name:'Website' },    lawyer: { id:'u2', firstName:'James',  lastName:'Williams'}, emails:[{emailId:'fatima.k@gmail.com'}],    phones:[{phoneNo:'+971509876543'}] },
  { id: 'l3', firstName: 'Robert',   lastName: 'Chen',      companyName: 'Chen Enterprises',    leadType: 'COMPANY', currentStatus: 'PROPOSAL',   createdAt: '2025-03-22', practiceArea: { id:'pa3', name:'Commercial' },  leadSource: { id:'ls3', name:'LinkedIn' },   lawyer: { id:'u1', firstName:'Sarah',  lastName:'Johnson' }, emails:[{emailId:'r.chen@chenent.com'}],    phones:[{phoneNo:'+971555123456'}] },
  { id: 'l4', firstName: 'Aisha',    lastName: 'Al Zaabi',  companyName: '',                    leadType: 'PERSON',  currentStatus: 'CLOSED',     createdAt: '2025-04-05', practiceArea: { id:'pa1', name:'Corporate' },    leadSource: { id:'ls1', name:'Referral' },  lawyer: { id:'u2', firstName:'James',  lastName:'Williams'}, emails:[{emailId:'aisha.z@email.com'}],     phones:[{phoneNo:'+971502345678'}] },
]

export const leadHandlers = [
  http.get(`${BASE}/api/leads/list/filter`, () =>
    HttpResponse.json({ data: { content: LEADS, totalElements: LEADS.length, totalPages: 1, number: 0, size: 25 } })
  ),

  http.get(`${BASE}/api/leads/get/single`, ({ request }) => {
    const id   = new URL(request.url).searchParams.get('leadId')
    const lead = LEADS.find(l => l.id === id) ?? LEADS[0]
    return HttpResponse.json({ data: lead })
  }),

  http.post(`${BASE}/api/leads/add`,     () => HttpResponse.json({ data: { id: 'l-new', message: 'Lead created' } })),
  http.post(`${BASE}/api/leads/edit`,    () => HttpResponse.json({ data: { message: 'Lead updated' } })),
  http.post(`${BASE}/api/leads/convert`, () => HttpResponse.json({ data: { message: 'Lead converted successfully' } })),

  http.get(`${BASE}/api/leads/get/followup`, () =>
    HttpResponse.json({ data: [
      { id:'f1', followUpContent:'Initial consultation scheduled', createdAt:'2025-01-20', followUpTime:'2025-01-20' },
      { id:'f2', followUpContent:'Client requested proposal document', createdAt:'2025-01-28', followUpTime:'2025-01-28' },
    ]})
  ),

  http.post(`${BASE}/api/leads/add/followup`, () =>
    HttpResponse.json({ data: { message: 'Follow-up added' } })
  ),
]
