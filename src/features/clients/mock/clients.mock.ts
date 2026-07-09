import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
const C = [
  { id:"c1", firstName:"Mohammed", lastName:"Al Rashid", companyName:"Al Rashid Holdings", clientType:"COMPANY", email:[{emailId:"m@holdings.ae"}], phones:[{phoneNo:"+971501234567"}], active:true },
  { id:"c2", firstName:"Emily",    lastName:"Harper",    companyName:"",                  clientType:"PERSON",  email:[{emailId:"emily@gmail.com"}], phones:[{phoneNo:"+971507654321"}], active:true },
  { id:"c3", firstName:"Khalid",   lastName:"Al Mazrouei", companyName:"KM Properties",  clientType:"COMPANY", email:[{emailId:"ceo@km.ae"}], phones:[{phoneNo:"+971556789012"}], active:true },
]
export const clientsMockHandlers = [
  http.get(`${B}/api/client/filter`,             () => HttpResponse.json({ data:{ content:C, totalElements:C.length, totalPages:1, number:0, size:25 } })),
  http.get(`${B}/api/client/get/by/company/:id`, ({ params }) => HttpResponse.json({ data: C.find(x=>x.id===params.id)??C[0] })),
  http.get(`${B}/api/client/get/short-info`,     () => HttpResponse.json({ content: C.map(x=>{return {id:x.id,companyName:x.companyName,firstName:x.firstName,lastName:x.lastName}}) })),
  http.post(`${B}/api/client/add`,               () => HttpResponse.json({ data:{ id:"c-new" } })),
  http.post(`${B}/api/client/edit`,              () => HttpResponse.json({ data:{ message:"Updated" } })),
]
