import { http, HttpResponse } from "msw"
const B = import.meta.env["VITE_API_BASE_URL"] ?? "https://testapi.alshamsilegallms.com"
export const authMockHandlers = [
  http.post(`${B}/api/auth/signin`, async ({ request }) => {
    const body = await request.json() as Record<string,string>
    if (body.email === "admin@legaleagle.com" && body.password === "password")
      return HttpResponse.json({ data: { token:"mock-jwt-token", refreshToken:"mock-refresh", user:{ id:"u1", firstName:"Admin", lastName:"User", email:"admin@legaleagle.com", companyUserType:"ADMIN", active:true } } })
    return HttpResponse.json({ message:"Invalid credentials" }, { status:401 })
  }),
  http.post(`${B}/api/auth/refresh/token`, () => HttpResponse.json({ data:{ token:"mock-jwt-refreshed" } })),
  http.post(`${B}/api/auth/reset/password`, () => HttpResponse.json({ data:{ message:"Reset email sent" } })),
  http.get(`${B}/api/user/get/access/menu`, () => HttpResponse.json({ data:[
    { id:"dashboard", menuName:"Dashboard", icon:"DashboardOutlined",        path:"/dashboard" },
    { id:"leads",     menuName:"Leads",     icon:"TrendingUpOutlined",        path:"/leads" },
    { id:"clients",   menuName:"Clients",   icon:"BusinessOutlined",          path:"/clients" },
    { id:"matters",   menuName:"Matters",   icon:"GavelOutlined",             path:"/matters" },
    { id:"billing",   menuName:"Billing",   icon:"ReceiptLongOutlined",       path:"/billing" },
    { id:"tasks",     menuName:"Tasks",     icon:"TaskAltOutlined",           path:"/tasks" },
    { id:"timelogs",  menuName:"Time Logs", icon:"AccessTimeOutlined",        path:"/timelogs" },
    { id:"lfa",       menuName:"LFA",       icon:"DescriptionOutlined",       path:"/lfa" },
    { id:"reports",   menuName:"Reports",   icon:"BarChartOutlined",          path:"/reports/wip" },
    { id:"admin",     menuName:"Admin",     icon:"AdminPanelSettingsOutlined", path:"/admin/users" },
  ]})),
  http.get(`${B}/api/group/get`, () => HttpResponse.json({ data:[{ id:"g1", name:"Administrators", permission:[{ menuId:"leads", accessModifies:[{ submenuId:"leads", visible:true, add:true, edit:true, delete:true }] }] }] })),
]
