import type {
  ApiMenuItem,
  ApiUserGroup,
  ApiSubmenuPermission,
  PermissionSet,
} from '@/types/auth.types'
import { PERMISSIONS } from '@config/permissions'

/**
 * permissions.ts
 *
 * IMPORTANT — corrected against the actual backend Swagger schema:
 *
 *   GET /api/user/get/access/menu  -> ApiMenuItem[]   { id, menuName, url, parent, seqno }
 *     Returns the menu TREE the user can see, but items carry NO
 *     visible/add/edit/delete flags.
 *
 *   GET /api/group/get             -> ApiUserGroup    { name, permission: ApiGroupPermission[] }
 *     The actual SubmenuPermission { submenuId, visible, add, edit, delete }
 *     flags live here, keyed by menuId (= ApiMenuItem.id).
 *
 * The previous version looked for a `permission` field directly on the menu
 * node from /access/menu -- that field does not exist on that endpoint, so
 * resolvePermissions() produced an almost-empty permission set, which is why
 * protectedLoader() redirected everyone to /403 right after login.
 *
 * Fix: resolvePermissions() now takes BOTH responses and joins them by id.
 * AuthProvider fetches both in parallel and passes them here together.
 */

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

const MENU_NAME_TO_RESOURCE: Record<string, string> = {
  dashboard:           'dashboard',
  leads:               'leads',
  myleads:             'my_leads',
  clients:             'clients',
  matters:             'matters',
  checkconflict:       'matters',
  timelogentries:      'timelogs',
  timelogentrycalendar:'timelogs',
  calendar:            'calendar',
  tasks:               'tasks',
  tasktemplates:       'tasks',
  invoice:             'billing',
  invoices:            'billing',
  billing:             'billing',
  billings:            'billing',
  lfa:                 'lfa',
  defaultlfas:         'lfa',
  lfareports:          'lfa',
  clientlfas:          'lfa',
  invoiceapproval:     'billing',
  lfaapproval:         'lfa',
  taskapproval:        'tasks',
  approvals:           'billing',
  reports:             'reports',
  wipreports:          'reports',
  billedamountreport:  'reports',
  matterbillingreport: 'reports',
  utilizationreport:   'reports',
  activityhistoryreport:'reports',
  marginerosionreport: 'reports',
  collections:         'reports',
  lfareferralreport:   'reports',
  team:                'team',
  myteam:              'team',
  hearingcalendar:     'team',
  timelogsreview:      'timelogs',
  timelogspreapproval: 'timelogs',
  timelogsapproval:    'timelogs',
  integrations:        'onedrive',
  onedrive:            'onedrive',
  budgeting:           'budgeting',
  costcards:           'budgeting',
  budgetcards:         'budgeting',
  ratecards:           'budgeting',
  manageusers:         'users',
  accounts:            'users',
  groups:              'groups',
  locations:           'locations',
  settings:            'settings',
  raisedtickets:       'tickets',
  referralcommission:  'lfa',
}

function resourceForMenuItem(item: ApiMenuItem): string | undefined {
  const byName = MENU_NAME_TO_RESOURCE[normalise(item.menuName ?? '')]
  if (byName) return byName
  const urlSlug = (item.url ?? '').replace(/^\//, '').split('/')[0]
  return MENU_NAME_TO_RESOURCE[normalise(urlSlug)]
}

function mapActionsFromPermission(resource: string, perm: ApiSubmenuPermission): string[] {
  const actions: string[] = []
  if (perm.visible) actions.push(`${resource}:view`)
  if (perm.add)     actions.push(`${resource}:create`)
  if (perm.edit)    actions.push(`${resource}:edit`)
  if (perm.delete)  actions.push(`${resource}:delete`)

  if (perm.edit) {
    if (resource === 'billing')   actions.push('billing:approve', 'billing:pay', 'billing:export')
    if (resource === 'timelogs')  actions.push('timelogs:approve', 'timelogs:export')
    if (resource === 'lfa')       actions.push('lfa:approve')
    if (resource === 'reports')   actions.push('reports:export')
    if (resource === 'groups')    actions.push('groups:manage')
    if (resource === 'settings')  actions.push('settings:manage')
    if (resource === 'budgeting') actions.push('budgeting:manage')
    if (resource === 'onedrive')  actions.push('onedrive:manage')
    if (resource === 'locations') actions.push('locations:manage')
    if (resource === 'team')      actions.push('team:manage')
    if (resource === 'users')     actions.push('users:block')
  }
  return actions
}

/**
 * @param menuItems  result of GET /api/user/get/access/menu
 * @param groups     result of GET /api/group/get (the user's own group(s));
 *                   pass an empty array if unavailable -- every visible menu
 *                   item then falls back to view-only access (fail-open on
 *                   visibility, since the backend already filtered the tree
 *                   to only what this user is allowed to see).
 */
export function resolvePermissions(
  menuItems: ApiMenuItem[],
  groups: ApiUserGroup[] = [],
): PermissionSet {
  const permissions = new Set<string>()

  const submenuByMenuId = new Map<string, ApiSubmenuPermission>()
  groups.forEach((group) => {
    group.permission?.forEach((gp) => {
      gp.accessModifies?.forEach((sp) => {
        submenuByMenuId.set(sp.submenuId, sp)
      })
      if (gp.menuId && !submenuByMenuId.has(gp.menuId) && gp.accessModifies?.length) {
        submenuByMenuId.set(gp.menuId, gp.accessModifies[0])
      }
    })
  })

  function processItem(item: ApiMenuItem) {
    const resource = resourceForMenuItem(item)

    if (resource) {
      const explicitPerm = submenuByMenuId.get(item.id)
      if (explicitPerm) {
        mapActionsFromPermission(resource, explicitPerm).forEach((a) => permissions.add(a))
      } else {
        permissions.add(`${resource}:view`)
      }
    }

    item.children?.forEach(processItem)
  }

  menuItems.forEach(processItem)
  return permissions
}

export function hasPermission(permissions: PermissionSet, permission: string): boolean {
  if (permissions.has(permission)) return true
  const [resource] = permission.split(':')
  if (permissions.has(`${resource}:*`)) return true
  if (permissions.has('*')) return true
  return false
}

export function buildAdminPermissions(): PermissionSet {
  return new Set(Object.values(PERMISSIONS))
}
