import { http, HttpResponse } from 'msw'

const BASE = 'https://testapi.alshamsilegallms.com'

export const authHandlers = [
  http.post(`${BASE}/api/auth/signin`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.email === 'admin@legaleagle.com' && body.password === 'password') {
      return HttpResponse.json({
        data: {
          token: 'mock-jwt-token-admin',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'user-1',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@legaleagle.com',
            companyUserType: 'ADMIN',
            active: true,
          },
        },
      })
    }
    return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
  }),

  http.post(`${BASE}/api/auth/refresh/token`, () =>
    HttpResponse.json({ data: { token: 'mock-jwt-token-refreshed' } })
  ),

  http.get(`${BASE}/api/user/get/access/menu`, () =>
    HttpResponse.json({
      data: [
        { id: 'dashboard',  menuName: 'Dashboard',  icon: 'DashboardOutlined',        path: '/dashboard' },
        { id: 'leads',      menuName: 'Leads',       icon: 'TrendingUpOutlined',        path: '/leads' },
        { id: 'clients',    menuName: 'Clients',     icon: 'BusinessOutlined',          path: '/clients' },
        { id: 'matters',    menuName: 'Matters',     icon: 'GavelOutlined',             path: '/matters' },
        { id: 'billing',    menuName: 'Billing',     icon: 'ReceiptLongOutlined',       path: '/billings' },
        { id: 'timelogs',   menuName: 'Time Logs',   icon: 'AccessTimeOutlined',        path: '/time-log-entries' },
        { id: 'tasks',      menuName: 'Tasks',       icon: 'TaskAltOutlined',           path: '/tasks' },
        { id: 'reports',    menuName: 'Reports',     icon: 'BarChartOutlined',          path: '/reports/wip' },
        { id: 'admin',      menuName: 'Admin',       icon: 'AdminPanelSettingsOutlined',path: '/admin/users' },
      ],
    })
  ),

  http.get(`${BASE}/api/group/get`, () =>
    HttpResponse.json({
      data: [
        {
          id: 'group-1', name: 'Administrators',
          permission: [{
            menuId: 'leads',
            accessModifies: [{ submenuId: 'leads', visible: true, add: true, edit: true, delete: true }],
          }],
        },
        { id: 'group-2', name: 'Associates', permission: [] },
        { id: 'group-3', name: 'Paralegals',  permission: [] },
      ],
    })
  ),
]
