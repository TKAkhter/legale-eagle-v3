import { authMockHandlers }      from "../features/auth/mock/auth.mock"
import { leadsMockHandlers }     from "../features/leads/mock/leads.mock"
import { clientsMockHandlers }   from "../features/clients/mock/clients.mock"
import { mattersMockHandlers }   from "../features/matters/mock/matters.mock"
import { billingMockHandlers }   from "../features/billing/mock/billing.mock"
import { tasksMockHandlers }     from "../features/tasks/mock/tasks.mock"
import { timelogsMockHandlers }  from "../features/timelogs/mock/timelogs.mock"
import { dashboardMockHandlers } from "../features/dashboard/mock/dashboard.mock"
import { lfaMockHandlers }       from "../features/lfa/mock/lfa.mock"
import { reportsMockHandlers }   from "../features/reports/mock/reports.mock"
import { adminMockHandlers }     from "../features/admin/mock/admin.mock"
export const handlers = [
  ...authMockHandlers, ...leadsMockHandlers, ...clientsMockHandlers, ...mattersMockHandlers,
  ...billingMockHandlers, ...tasksMockHandlers, ...timelogsMockHandlers, ...dashboardMockHandlers,
  ...lfaMockHandlers, ...reportsMockHandlers, ...adminMockHandlers,
]
