import { http, HttpResponse } from 'msw'

const BASE = 'https://testapi.alshamsilegallms.com'

const USERS = [
  { id: 'u1', firstName: 'Sarah',  lastName: 'Johnson',  email: 'sarah@firm.com',  companyUserType: 'ATTORNEY',    active: true,  department: { id:'d1', name:'Litigation' },  designation: { id:'dg1', name:'Partner' } },
  { id: 'u2', firstName: 'James',  lastName: 'Williams', email: 'james@firm.com',  companyUserType: 'ATTORNEY',    active: true,  department: { id:'d1', name:'Litigation' },  designation: { id:'dg2', name:'Associate' } },
  { id: 'u3', firstName: 'Priya',  lastName: 'Sharma',   email: 'priya@firm.com',  companyUserType: 'NONATTORNEY', active: true,  department: { id:'d2', name:'Corporate' },   designation: { id:'dg3', name:'Paralegal' } },
  { id: 'u4', firstName: 'Ahmed',  lastName: 'Al Mansouri', email: 'ahmed@firm.com', companyUserType: 'ATTORNEY', active: false, department: { id:'d2', name:'Corporate' },   designation: { id:'dg2', name:'Associate' } },
]

export const userHandlers = [
  http.get(`${BASE}/api/user/get`, () =>
    HttpResponse.json({ data: { content: USERS, totalElements: USERS.length, totalPages: 1, number: 0, size: 25 } })
  ),

  http.get(`${BASE}/api/user/get/min`, () =>
    HttpResponse.json({ data: USERS.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })) })
  ),

  http.get(`${BASE}/api/user/get/by/id`, ({ request }) => {
    const url   = new URL(request.url)
    const id    = url.searchParams.get('userId')
    const user  = USERS.find(u => u.id === id) ?? USERS[0]
    return HttpResponse.json({ data: user })
  }),

  http.post(`${BASE}/api/user/sendRequest`, () =>
    HttpResponse.json({ data: { message: 'Invitation sent successfully' } })
  ),

  http.post(`${BASE}/api/user/edit`, () =>
    HttpResponse.json({ data: { message: 'User updated' } })
  ),

  http.put(`${BASE}/api/user/block/:userId`, () =>
    HttpResponse.json({ data: { message: 'User status updated' } })
  ),

  http.post(`${BASE}/api/user/change/password/admin`, () =>
    HttpResponse.json({ data: { message: 'Password reset successfully' } })
  ),

  http.put(`${BASE}/api/user/extra/permission/:userId`, () =>
    HttpResponse.json({ data: { message: 'Permissions updated' } })
  ),
]
