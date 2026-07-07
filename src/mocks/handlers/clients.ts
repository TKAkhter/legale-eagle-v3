import { http, HttpResponse } from 'msw'
const BASE = 'https://testapi.alshamsilegallms.com'

const CLIENTS = [
  { id:'c1', firstName:'Mohammed', lastName:'Al Rashid', companyName:'Al Rashid Holdings', clientType:'COMPANY', email:[{emailId:'m.alrashid@holdings.ae'}], phones:[{phoneNo:'+971501234567'}], trnNo:'100234567890003', active:true, referral:false },
  { id:'c2', firstName:'Emily',    lastName:'Harper',    companyName:'',                   clientType:'PERSON',  email:[{emailId:'emily.h@gmail.com'}],        phones:[{phoneNo:'+971507654321'}], trnNo:'',              active:true, referral:true, referralName:'James Williams' },
  { id:'c3', firstName:'Khalid',   lastName:'Al Mazrouei', companyName:'KM Properties',   clientType:'COMPANY', email:[{emailId:'ceo@kmproperties.ae'}],      phones:[{phoneNo:'+971556789012'}], trnNo:'100987654321003', active:true, referral:false },
]

export const clientHandlers = [
  http.get(`${BASE}/api/client/filter`, () =>
    HttpResponse.json({ data: { content: CLIENTS, totalElements: CLIENTS.length, totalPages:1, number:0, size:25 } })
  ),
  http.get(`${BASE}/api/client/get/short-info`, () =>
    HttpResponse.json({ content: CLIENTS.map(c=>({ id:c.id, companyName:c.companyName, firstName:c.firstName, lastName:c.lastName })), totalElements:CLIENTS.length })
  ),
  http.get(`${BASE}/api/client/get/by/company/:id`, ({ params }) => {
    const c = CLIENTS.find(x => x.id === params.id) ?? CLIENTS[0]
    return HttpResponse.json({ data: c })
  }),
  http.post(`${BASE}/api/client/add`,  () => HttpResponse.json({ data: { id:'c-new', message:'Client created' } })),
  http.post(`${BASE}/api/client/edit`, () => HttpResponse.json({ data: { message:'Client updated' } })),
]
