import HistoryIcon from '@mui/icons-material/History'
import EmailIcon from '@mui/icons-material/Email'
import { PERMISSIONS } from './permissions'

/**
 * Fallback navigation config — used only as shape reference and loading state.
 * At runtime this is OVERRIDDEN by /api/user/get/access/menu response.
 *
 * Structure mirrors Next.js App Router file paths so sidebar links
 * stay in sync with the directory structure.
 */

export type NavItem = {
  id: string
  title: string            // translation key: nav.{id}
  path?: string
  icon?: string            // Material icon name string
  permission?: string      // hide if user lacks this permission
  children?: NavItem[]
  badge?: string           // dynamic badge (count from API)
  dividerAfter?: boolean
}

export const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    title: 'nav.dashboard',
    path: '/dashboard',
    icon: 'DashboardOutlined',
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    id: 'crm',
    title: 'nav.crm',
    icon: 'PeopleOutlined',
    children: [
      {
        id: 'leads',
        title: 'nav.leads',
        path: '/leads',
        icon: 'TrendingUpOutlined',
        permission: PERMISSIONS.LEADS_VIEW,
      },
      {
        id: 'my-leads',
        title: 'nav.myLeads',
        path: '/my-leads',
        icon: 'PersonSearchOutlined',
        permission: PERMISSIONS.MY_LEADS_VIEW,
      },
      {
        id: 'clients',
        title: 'nav.clients',
        path: '/clients',
        icon: 'BusinessOutlined',
        permission: PERMISSIONS.CLIENTS_VIEW,
      },
    ],
  },
  {
    id: 'matters',
    title: 'nav.matters',
    icon: 'GavelOutlined',
    children: [
      {
        id: 'matters-list',
        title: 'nav.matters',
        path: '/matters',
        icon: 'FolderOutlined',
        permission: PERMISSIONS.MATTERS_VIEW,
      },
      {
        id: 'check-conflict',
        title: 'nav.checkConflict',
        path: '/matters/check-conflict',
        icon: 'FindInPageOutlined',
        permission: PERMISSIONS.MATTERS_VIEW,
      },
    ],
  },
  {
    id: 'time-tasks',
    title: 'nav.timeAndTasks',
    icon: 'TimerOutlined',
    children: [
      {
        id: 'time-log-entries',
        title: 'nav.timeLogEntries',
        path: '/time-log-entries',
        icon: 'AccessTimeOutlined',
        permission: PERMISSIONS.TIMELOGS_VIEW,
      },
      {
        id: 'tasks',
        title: 'nav.tasks',
        path: '/tasks',
        icon: 'TaskAltOutlined',
        permission: PERMISSIONS.TASKS_VIEW,
      },
      {
        id: 'calendar',
        title: 'nav.calendar',
        path: '/calendar',
        icon: 'CalendarMonthOutlined',
        permission: PERMISSIONS.CALENDAR_VIEW,
      },
    ],
  },
  {
    id: 'billing',
    title: 'nav.billing',
    icon: 'ReceiptOutlined',
    children: [
      {
        id: 'billings',
        title: 'nav.billing',
        path: '/billings',
        icon: 'ReceiptLongOutlined',
        permission: PERMISSIONS.BILLING_VIEW,
      },
      {
        id: 'invoices',
        title: 'nav.invoices',
        path: '/billings/invoices',
        icon: 'RequestPageOutlined',
        permission: PERMISSIONS.BILLING_VIEW,
      },
    ],
  },
  {
    id: 'approvals',
    title: 'nav.approvals',
    icon: 'CheckCircleOutlined',
    children: [
      {
        id: 'invoice-approval',
        title: 'nav.invoiceApproval',
        path: '/approvals/invoice',
        icon: 'FactCheckOutlined',
        permission: PERMISSIONS.BILLING_APPROVE,
      },
      {
        id: 'lfa-approval',
        title: 'nav.lfaApproval',
        path: '/approvals/lfa',
        icon: 'AssignmentTurnedInOutlined',
        permission: PERMISSIONS.LFA_APPROVE,
      },
      {
        id: 'task-approval',
        title: 'nav.taskApproval',
        path: '/approvals/task',
        icon: 'AssignmentOutlined',
        permission: PERMISSIONS.TASKS_VIEW,
      },
    ],
  },
  {
    id: 'lfa',
    title: 'nav.lfa',
    icon: 'ArticleOutlined',
    children: [
      {
        id: 'lfa-list',
        title: 'nav.lfa',
        path: '/lfa',
        icon: 'DescriptionOutlined',
        permission: PERMISSIONS.LFA_VIEW,
      },
      {
        id: 'default-lfas',
        title: 'nav.defaultLfas',
        path: '/lfa/default',
        icon: 'LibraryBooksOutlined',
        permission: PERMISSIONS.LFA_VIEW,
      },
      {
        id: 'lfa-reports',
        title: 'nav.lfaReports',
        path: '/lfa/reports',
        icon: 'SummarizeOutlined',
        permission: PERMISSIONS.LFA_VIEW,
      },
      {
        id: 'client-lfas',
        title: 'nav.clientLfas',
        path: '/lfa/client',
        icon: 'ManageAccountsOutlined',
        permission: PERMISSIONS.LFA_VIEW,
      },
    ],
  },
  {
    id: 'timelogs',
    title: 'nav.timelogsReview',
    icon: 'RateReviewOutlined',
    children: [
      {
        id: 'timelogs-review',
        title: 'nav.timelogsReview',
        path: '/timelogs/review',
        icon: 'ReviewsOutlined',
        permission: PERMISSIONS.TIMELOGS_APPROVE,
      },
      {
        id: 'timelogs-pre-approval',
        title: 'nav.timelogsPreApproval',
        path: '/timelogs/pre-approval',
        icon: 'PendingActionsOutlined',
        permission: PERMISSIONS.TIMELOGS_APPROVE,
      },
      {
        id: 'timelogs-approval',
        title: 'nav.timelogsApproval',
        path: '/timelogs/approval',
        icon: 'HowToRegOutlined',
        permission: PERMISSIONS.TIMELOGS_APPROVE,
      },
    ],
  },
  {
    id: 'reports',
    title: 'nav.reports',
    icon: 'BarChartOutlined',
    permission: PERMISSIONS.REPORTS_VIEW,
    children: [
      { id: 'wip-reports',       title: 'nav.wipReports',      path: '/reports/wip',              icon: 'WorkOutlineOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'billed-amount',     title: 'nav.billedAmount',    path: '/reports/billed-amount',    icon: 'PaidOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'matter-billing',    title: 'nav.matterBilling',   path: '/reports/matter-billing',   icon: 'AccountBalanceOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'utilization',       title: 'nav.utilization',     path: '/reports/utilization',      icon: 'SpeedOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'activity-history',  title: 'nav.activityHistory', path: '/reports/activity-history', icon: 'HistoryOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'collections',       title: 'nav.collections',     path: '/reports/collections',      icon: 'CollectionsBookmarkOutlined', permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'margin-erosion',    title: 'nav.marginErosion',   path: '/reports/margin-erosion',   icon: 'TrendingDownOutlined', permission: PERMISSIONS.REPORTS_VIEW },
    ],
  },
  {
    id: 'team',
    title: 'nav.team',
    icon: 'GroupsOutlined',
    children: [
      { id: 'my-team',          title: 'nav.myTeam',         path: '/team',                    icon: 'GroupOutlined', permission: PERMISSIONS.TEAM_VIEW },
      { id: 'hearing-calendar', title: 'nav.hearingCalendar',path: '/team/hearing-calendar',   icon: 'EventNoteOutlined', permission: PERMISSIONS.TEAM_VIEW },
    ],
  },
  {
    id: 'integrations',
    title: 'nav.integrations',
    icon: 'IntegrationInstructionsOutlined',
    dividerAfter: false,
    children: [
      { id: 'onedrive', title: 'nav.oneDrive', path: '/integrations/onedrive', icon: 'CloudOutlined', permission: PERMISSIONS.ONEDRIVE_VIEW },
    ],
  },
  {
    id: 'budgeting',
    title: 'nav.budgeting',
    icon: 'AccountBalanceWalletOutlined',
    children: [
      { id: 'cost-cards',   title: 'nav.costCards',   path: '/budgeting/cost-cards',   icon: 'CreditCardOutlined', permission: PERMISSIONS.BUDGETING_VIEW },
      { id: 'budget-cards', title: 'nav.budgetCards', path: '/budgeting/budget-cards', icon: 'SavingsOutlined', permission: PERMISSIONS.BUDGETING_VIEW },
      { id: 'rate-cards',   title: 'nav.rateCards',   path: '/budgeting/rate-cards',   icon: 'PriceChangeOutlined', permission: PERMISSIONS.BUDGETING_VIEW },
    ],
  },
  {
    id: 'admin',
    title: 'nav.admin',
    icon: 'AdminPanelSettingsOutlined',
    dividerAfter: true,
    children: [
      { id: 'users',       title: 'nav.manageUsers', path: '/admin/users',       icon: 'ManageAccountsOutlined', permission: PERMISSIONS.USERS_VIEW },
      { id: 'groups',      title: 'nav.groups',      path: '/admin/groups',      icon: 'GroupWorkOutlined', permission: PERMISSIONS.GROUPS_VIEW },
      { id: 'permissions', title: 'nav.permissions', path: '/admin/permissions', icon: 'LockOutlined', permission: PERMISSIONS.GROUPS_MANAGE },
      { id: 'locations',   title: 'nav.locations',   path: '/admin/locations',   icon: 'LocationOnOutlined', permission: PERMISSIONS.LOCATIONS_VIEW },
      { id: 'settings',    title: 'nav.settings',    path: '/admin/settings',    icon: 'SettingsOutlined', permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    id: 'tickets',
    title: 'nav.raisedTickets',
    path: '/tickets',
    icon: 'ConfirmationNumberOutlined',
    permission: PERMISSIONS.TICKETS_VIEW,
  },
]
