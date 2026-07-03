/**
 * Permission constants matching the backend's UserGroupDTO → SubmenuPermission shape.
 * Format: resource:action
 *
 * The backend controls RBAC via /api/user/get/access/menu which returns
 * MenuItems with SubmenuPermission { visible, add, edit, delete }.
 * We normalise these into flat string permissions for ergonomic use in
 * usePermission() and <Can> component.
 *
 * To add a new resource: add entries here and map them in lib/auth/permissions.ts
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',

  // Leads
  LEADS_VIEW:   'leads:view',
  LEADS_CREATE: 'leads:create',
  LEADS_EDIT:   'leads:edit',
  LEADS_DELETE: 'leads:delete',
  LEADS_EXPORT: 'leads:export',

  // My Leads
  MY_LEADS_VIEW: 'my_leads:view',

  // Clients
  CLIENTS_VIEW:   'clients:view',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_EDIT:   'clients:edit',
  CLIENTS_DELETE: 'clients:delete',
  CLIENTS_EXPORT: 'clients:export',

  // Matters
  MATTERS_VIEW:   'matters:view',
  MATTERS_CREATE: 'matters:create',
  MATTERS_EDIT:   'matters:edit',
  MATTERS_DELETE: 'matters:delete',
  MATTERS_CLOSE:  'matters:close',
  MATTERS_EXPORT: 'matters:export',

  // Time Logs (Activities)
  TIMELOGS_VIEW:    'timelogs:view',
  TIMELOGS_CREATE:  'timelogs:create',
  TIMELOGS_EDIT:    'timelogs:edit',
  TIMELOGS_DELETE:  'timelogs:delete',
  TIMELOGS_APPROVE: 'timelogs:approve',
  TIMELOGS_EXPORT:  'timelogs:export',

  // Calendar
  CALENDAR_VIEW:   'calendar:view',
  CALENDAR_CREATE: 'calendar:create',

  // Tasks
  TASKS_VIEW:   'tasks:view',
  TASKS_CREATE: 'tasks:create',
  TASKS_EDIT:   'tasks:edit',
  TASKS_DELETE: 'tasks:delete',

  // Invoices / Billing
  BILLING_VIEW:    'billing:view',
  BILLING_CREATE:  'billing:create',
  BILLING_EDIT:    'billing:edit',
  BILLING_DELETE:  'billing:delete',
  BILLING_APPROVE: 'billing:approve',
  BILLING_PAY:     'billing:pay',
  BILLING_EXPORT:  'billing:export',

  // LFA
  LFA_VIEW:    'lfa:view',
  LFA_CREATE:  'lfa:create',
  LFA_EDIT:    'lfa:edit',
  LFA_APPROVE: 'lfa:approve',

  // Reports
  REPORTS_VIEW:   'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Team
  TEAM_VIEW:   'team:view',
  TEAM_MANAGE: 'team:manage',

  // Integrations
  ONEDRIVE_VIEW:   'onedrive:view',
  ONEDRIVE_MANAGE: 'onedrive:manage',

  // Budgeting
  BUDGETING_VIEW:   'budgeting:view',
  BUDGETING_MANAGE: 'budgeting:manage',

  // Admin — Users
  USERS_VIEW:   'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT:   'users:edit',
  USERS_BLOCK:  'users:block',

  // Admin — Groups / Permissions
  GROUPS_VIEW:   'groups:view',
  GROUPS_MANAGE: 'groups:manage',

  // Admin — Locations
  LOCATIONS_VIEW:   'locations:view',
  LOCATIONS_MANAGE: 'locations:manage',

  // Settings
  SETTINGS_VIEW:   'settings:view',
  SETTINGS_MANAGE: 'settings:manage',

  // Raised Tickets
  TICKETS_VIEW:   'tickets:view',
  TICKETS_CREATE: 'tickets:create',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
