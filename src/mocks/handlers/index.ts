import { authHandlers }      from './auth'
import { userHandlers }      from './users'
import { leadHandlers }      from './leads'
import { clientHandlers }    from './clients'
import { matterHandlers }    from './matters'
import { billingHandlers }   from './billing'
import { dashboardHandlers } from './dashboard'
import { miscHandlers }      from './misc'

export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...leadHandlers,
  ...clientHandlers,
  ...matterHandlers,
  ...billingHandlers,
  ...dashboardHandlers,
  ...miscHandlers,
]
