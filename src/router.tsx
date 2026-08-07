import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { protectedLoader } from '@/middleware'
import { PERMISSIONS } from '@config/permissions'

const Spin = () => <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}><CircularProgress /></Box>
const L = (fn: () => Promise<{ default: React.ComponentType }>) => { const C = lazy(fn); return <Suspense fallback={<Spin />}><C /></Suspense> }

const AuthLayout = lazy(() => import('./app/(auth)/layout').then(m => ({ default: m.default })))
const MainLayout = lazy(() => import('./app/(dashboard)/layout').then(m => ({ default: m.default })))

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: <Suspense fallback={<Spin />}><AuthLayout /></Suspense>,
    children: [
      { path: '/login',           element: L(() => import('./app/(auth)/login/page')) },
      { path: '/register',        element: L(() => import('./app/(auth)/register/page')) },
      { path: '/forgot-password', element: L(() => import('./app/(auth)/forgot-password/page')) },
    ],
  },
  {
    element: <Suspense fallback={<Spin />}><MainLayout /></Suspense>,
    loader: protectedLoader(),
    children: [
      { path: '/dashboard',         loader: protectedLoader('/dashboard'),  element: L(() => import('./app/(dashboard)/dashboard/page')) },
      { path: '/leads',             loader: protectedLoader('/leads'),       element: L(() => import('./app/(dashboard)/leads/page')) },
      { path: '/leads/:leadId',     loader: protectedLoader('/leads'),       element: L(() => import('./app/(dashboard)/leads/[leadId]/page')) },
      { path: '/my-leads',          loader: protectedLoader('/my-leads'),    element: L(() => import('./app/(dashboard)/my-leads/page')) },
      { path: '/clients',           loader: protectedLoader('/clients'),     element: L(() => import('./app/(dashboard)/clients/page')) },
      { path: '/clients/:clientId', loader: protectedLoader('/clients'),     element: L(() => import('./app/(dashboard)/clients/[clientId]/page')) },
      { path: '/matters/check-conflict', loader: protectedLoader('/matters'), element: L(() => import('./app/(dashboard)/matters/check-conflict/page')) },
      { path: '/matters',           loader: protectedLoader('/matters'),     element: L(() => import('./app/(dashboard)/matters/page')) },
      { path: '/matters/:matterId', loader: protectedLoader('/matters'),     element: L(() => import('./app/(dashboard)/matters/[matterId]/page')) },
      { path: '/time-log-entries',  loader: protectedLoader('/time-log-entries'),    element: L(() => import('./app/(dashboard)/time-log-entries/page')) },
      { path: '/calendar',          loader: protectedLoader('/calendar'),    element: L(() => import('./app/(dashboard)/calendar/page')) },
      { path: '/tasks',             loader: protectedLoader('/tasks'),       element: L(() => import('./app/(dashboard)/tasks/page')) },
      { path: '/tasks/:taskId',     loader: protectedLoader('/tasks'),       element: L(() => import('./app/(dashboard)/tasks/[taskId]/page')) },
      { path: '/billings',              loader: protectedLoader('/billings'), element: L(() => import('./app/(dashboard)/billings/page')) },
      { path: '/billings/:invoiceId',    loader: protectedLoader('/billings'), element: L(() => import('./app/(dashboard)/billings/[invoiceId]/page')) },
      { path: '/approvals/invoice', loader: protectedLoader('/approvals/invoice'),  element: L(() => import('./app/(dashboard)/approvals/invoice/page')) },
      { path: '/approvals/lfa',     loader: protectedLoader(PERMISSIONS.LFA_APPROVE),      element: L(() => import('./app/(dashboard)/approvals/lfa/page')) },
      { path: '/approvals/task',    loader: protectedLoader('/tasks'),       element: L(() => import('./app/(dashboard)/approvals/task/page')) },
      { path: '/lfa',               loader: protectedLoader('/lfa'),         element: L(() => import('./app/(dashboard)/lfa/page')) },
      { path: '/lfa/:lfaId',         loader: protectedLoader('/lfa'),         element: L(() => import('./app/(dashboard)/lfa/[lfaId]/page')) },
      { path: '/lfa/default',       loader: protectedLoader('/lfa'),         element: L(() => import('./app/(dashboard)/lfa/default/page')) },
      { path: '/lfa/reports',       loader: protectedLoader('/lfa'),         element: L(() => import('./app/(dashboard)/lfa/reports/page')) },
      { path: '/lfa/client',        loader: protectedLoader('/lfa'),         element: L(() => import('./app/(dashboard)/lfa/client/page')) },
      { path: '/reports/wip',           loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/wip/page')) },
      { path: '/reports/billed-amount', loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/billed-amount/page')) },
      { path: '/reports/matter-billing',loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/matter-billing/page')) },
      { path: '/reports/utilization',   loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/utilization/page')) },
      { path: '/reports/activity-history', loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/activity-history/page')) },
      { path: '/reports/margin-erosion',   loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/margin-erosion/page')) },
      { path: '/reports/collections',      loader: protectedLoader('/reports/wip'), element: L(() => import('./app/(dashboard)/reports/collections/page')) },
      { path: '/team',                  loader: protectedLoader(PERMISSIONS.TEAM_VIEW),    element: L(() => import('./app/(dashboard)/team/page')) },
      { path: '/team/hearing-calendar', loader: protectedLoader(PERMISSIONS.TEAM_VIEW),    element: L(() => import('./app/(dashboard)/team/hearing-calendar/page')) },
      { path: '/timelogs/review',       loader: protectedLoader(PERMISSIONS.TIMELOGS_APPROVE), element: L(() => import('./app/(dashboard)/timelogs/review/page')) },
      { path: '/timelogs/pre-approval', loader: protectedLoader(PERMISSIONS.TIMELOGS_APPROVE), element: L(() => import('./app/(dashboard)/timelogs/pre-approval/page')) },
      { path: '/timelogs/approval',     loader: protectedLoader(PERMISSIONS.TIMELOGS_APPROVE), element: L(() => import('./app/(dashboard)/timelogs/approval/page')) },
      { path: '/integrations/onedrive', loader: protectedLoader(PERMISSIONS.ONEDRIVE_VIEW),element: L(() => import('./app/(dashboard)/integrations/onedrive/page')) },
      { path: '/budgeting/cost-cards',  loader: protectedLoader(PERMISSIONS.BUDGETING_VIEW), element: L(() => import('./app/(dashboard)/budgeting/cost-cards/page')) },
      { path: '/budgeting/budget-cards',loader: protectedLoader(PERMISSIONS.BUDGETING_VIEW), element: L(() => import('./app/(dashboard)/budgeting/budget-cards/page')) },
      { path: '/budgeting/rate-cards',  loader: protectedLoader(PERMISSIONS.BUDGETING_VIEW), element: L(() => import('./app/(dashboard)/budgeting/rate-cards/page')) },
      { path: '/admin/users',       loader: protectedLoader(PERMISSIONS.USERS_VIEW),       element: L(() => import('./app/(dashboard)/admin/users/page')) },
      { path: '/admin/groups',      loader: protectedLoader(PERMISSIONS.GROUPS_VIEW),      element: L(() => import('./app/(dashboard)/admin/groups/page')) },
      { path: '/admin/permissions', loader: protectedLoader(PERMISSIONS.GROUPS_MANAGE),    element: L(() => import('./app/(dashboard)/admin/permissions/page')) },
      { path: '/admin/locations',   loader: protectedLoader(PERMISSIONS.LOCATIONS_VIEW),   element: L(() => import('./app/(dashboard)/admin/locations/page')) },
      { path: '/admin/settings',    loader: protectedLoader(PERMISSIONS.SETTINGS_VIEW),    element: L(() => import('./app/(dashboard)/admin/settings/page')) },
    ],
  },
  { path: '/403', element: <Box sx={{ p: 4 }}><h2>403 — Access Denied</h2></Box> },
  { path: '*',    element: <Box sx={{ p: 4 }}><h2>404 — Page Not Found</h2></Box> },
])

export function AppRouter() { return <RouterProvider router={router} /> }
