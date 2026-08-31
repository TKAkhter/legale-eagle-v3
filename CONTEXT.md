# LegalEagle LMS — Developer Context

React 19 + TypeScript admin app for a Dubai legal firm. Built as a reusable Enterprise React Starter Kit.

## Quick Start

```bash
cp .env.example .env.local          # copy env vars
npm install                         # install deps
npm run dev                         # start dev server (http://localhost:3000)

# Login (static mode): admin@legaleagle.com / password
```

## Key Env Flags

| Flag | Default | What it does |
|------|---------|--------------|
| `VITE_USE_STATIC_DATA=true` | true | No backend needed — uses `src/data/static.ts` |
| `VITE_DYNAMIC_NAV=false` | false | Sidebar uses `config/navigation.ts` (not API) |
| `VITE_ENABLE_LOGS=true` | true | Shows `logger.debug/info/warn/error` in console |

**Start with `VITE_USE_STATIC_DATA=true` while developing UI. Switch to false when backend is ready.**

## Folder Structure

```
src/
├── app/
│   ├── (auth)/              ← Login, register, forgot password
│   └── (dashboard)/         ← All authenticated pages
│       ├── leads/page.tsx   ← List page
│       ├── leads/[leadId]/  ← Detail page
│       └── leads/_components/ ← Page-specific components
│
├── api/                     ← Backend API wrappers (USE_STATIC_DATA aware)
│   ├── leads.ts             ← leadsApi.getAll(), leadsApi.getById(), leadsApi.create()...
│   ├── clients.ts           ← clientsApi.*
│   ├── matters.ts           ← mattersApi.*
│   ├── billing.ts           ← billingApi.*
│   ├── tasks.ts             ← tasksApi.*
│   ├── timelogs.ts          ← timelogsApi.*
│   ├── lfa.ts               ← lfaApi.*
│   ├── admin.ts             ← adminApi.* (users, groups, lookups)
│   ├── reports.ts           ← reportsApi.*
│   ├── activity.ts          ← activityApi.*
│   ├── email.ts             ← emailApi.* (Microsoft Graph)
│   └── fileManager.ts       ← fileManagerApi.* (OneDrive)
│
├── transformers/            ← BE response → canonical FE shape
│   ├── lead.transformer.ts  ← transformLead(raw) → Lead
│   ├── client.transformer.ts
│   ├── matter.transformer.ts
│   └── user.transformer.ts
│
├── data/
│   └── static.ts            ← ALL static fixtures for demo mode
│
├── components/
│   ├── ui/                  ← Shared UI: PageShell, StatusBadge, Tabs, etc.
│   ├── data-grid/           ← DataGrid component + sub-components
│   ├── layout/              ← Sidebar, Toolbar, MainLayout, CommandPalette
│   ├── forms/               ← ControlledInput, ControlledSelect, etc.
│   ├── charts/              ← ApexChart wrapper
│   ├── widgets/             ← ActivityFeed, DashboardCustomiser, OnboardingChecklist
│   └── calendar/            ← AppCalendar (FullCalendar wrapper)
│
├── lib/
│   ├── store/               ← Zustand stores (authStore, themeStore, dashboardStore, stopwatchStore)
│   ├── api/axios.ts         ← axiosClient + axiosBlob (with 401 handler)
│   ├── auth/permissions.ts  ← hasPermission(), PERMISSIONS constants
│   ├── logger.ts            ← logger.debug/info/warn/error (gated by VITE_ENABLE_LOGS)
│   ├── toast.ts             ← toast.success/error/warning/info (global, no context needed)
│   ├── query/keys.ts        ← Typed query key factory (QK.leads.list(), etc.)
│   └── utils/               ← formatDate, formatCurrency, downloadBlob, fromNow
│
├── config/
│   ├── env.ts               ← ALL env vars in one place
│   ├── theme.ts             ← MUI theme builder
│   └── navigation.ts        ← Sidebar nav items + icons
│
└── types/
    ├── common.types.ts      ← PageResponse<T>, GridParams, shared types
    └── auth.types.ts        ← LoginResponse, AuthUser, AppNotification
```

## How to Add a New Page

1. **Create the page file:**
   ```
   src/app/(dashboard)/your-module/page.tsx
   ```

2. **Add the route in `src/router.tsx`:**
   ```ts
   { path: 'your-module', lazy: () => import('./app/(dashboard)/your-module/page').then(m => ({ Component: m.default })), loader: protectedLoader() }
   ```

3. **Add to sidebar in `src/config/navigation.ts`:**
   ```ts
   { id: 'your-module', title: 'Your Module', path: '/your-module', icon: <YourIcon /> }
   ```

4. **Create an API wrapper in `src/api/yourModule.ts`:**
   ```ts
   export const yourApi = {
     async getAll(p: GridParams) {
       if (env.USE_STATIC_DATA) return paginate(staticYourData, p)
       const r = await axiosClient.get('/api/your/endpoint', { params: { ... } })
       return r.data?.data ?? r.data
     }
   }
   ```

5. **Add static data in `src/data/static.ts`:**
   ```ts
   export const yourData = [ { id: 'y1', name: '...' } ]
   ```

## DataGrid Usage

The main list component. Use it on every list page:

```tsx
<DataGrid
  columns={[
    { field: 'name',   header: 'Name',   sortKey: 'name' },
    { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
    { field: 'date',   header: 'Date',   renderCell: (v) => new Date(String(v)).toLocaleDateString() },
  ]}
  queryKey={['your-module', 'list']}
  queryFn={(p) => yourApi.getAll(p)}
  hasFilters
  FilterPanel={YourFilters}
  detailPath={(row) => `/your-module/${row.id}`}
  rowMenuItems={(row) => [
    { label: 'Edit', icon: <EditIcon />, onClick: () => openEdit(row.id) },
  ]}
/>
```

## Form Drawers (create/edit)

Pattern used for all create/edit forms:

```tsx
// In your page:
const [drawerOpen, setDrawerOpen] = useState(false)

<Button onClick={() => setDrawerOpen(true)}>New Item</Button>

<YourFormDrawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  itemId={editId}  // undefined = create, string = edit
  onSaved={() => {
    setDrawerOpen(false)
    queryClient.invalidateQueries({ queryKey: ['your-module'] })
    toast.success('Saved!')
  }}
/>
```

## Toast Notifications

Use anywhere — no React context needed:

```ts
import { toast } from '@/lib/toast'

toast.success('Lead created')
toast.error('Failed to save')
toast.warning('Session expiring soon')
toast.info('Processing...')
```

## Logger

Use for debugging — only outputs when `VITE_ENABLE_LOGS=true`:

```ts
import { logger } from '@/lib/logger'

logger.debug('ComponentName', 'What happened', { optionalData })
logger.info('LeadsPage', 'Fetching leads', { page: 1 })
logger.error('authApi', 'Sign in failed', error)
```

## Static Data Mode

All pages check `env.USE_STATIC_DATA` before calling the backend:

```ts
// Pattern used in every api/ file:
async getAll(p: GridParams) {
  if (env.USE_STATIC_DATA) return paginate(staticLeads, p)  // ← static
  const r = await axiosClient.get('/api/leads')              // ← real API
  return r.data?.data ?? r.data
}
```

To add static data for a new module, add an export to `src/data/static.ts`.

## Transformer Layer

When the backend returns data in a different shape than the FE expects, transformers normalise it:

```
BE API response → transformer → canonical FE type → UI component
```

Transformers live in `src/transformers/`. They're called inside `src/api/` files, not in components. When you swap backends, update the transformer — zero page code changes needed.

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI |
| TypeScript | ~6.0 | Types |
| Vite | 8 | Build tool |
| MUI | v9.1 | Component library |
| React Router | v7 | Routing |
| TanStack Query | v5 | Server state / caching |
| React Hook Form | v7 | Forms |
| Zod | v4 | Validation schemas |
| Zustand | v5 | Client state |
| Axios | 1.17 | HTTP client |
| i18next | 26 | Translations (EN + AR) |
| ApexCharts | 5 | Charts |
| FullCalendar | 6 | Calendar |
| vite-plugin-pwa | — | PWA / offline |

## Phases Delivered

| Phase | What |
|-------|------|
| 12 | Auth, dark mode, sidebar, dashboard, toast, breadcrumbs, PageShell |
| 13 | PWA, column visibility, server sort, WIP/Utilization/MatterBilling reports |
| 14 | Logger, transformer layer, env.ts, responsive sidebar, DataGrid types, DensityToggle, EmailDialog, FilterPresetsBar |
| 15 | Command palette (Ctrl+K), GlobalSearch, NotificationsPanel, Settings page |
| 16 | Email viewer (Outlook-style), File manager (OneDrive-style), MobileCardList |
| 17 | Activity feed widget, Audit log, Printable invoice, Activity history report |
| 18 | Dashboard widget customisation, Onboarding checklist, Users/Groups/Team wired |
| 19 | All 52+ pages wired to static data, mutations guarded with env flag |
| 20 | DataGrid fully upgraded (density, zebra, row expansion, email, presets, mobile), transformers wired |
| 21 | Lead detail, Client detail, Matter detail — full tab layouts with static data |
| 22 | Stopwatch in Toolbar, Calendar with static hearings, Approvals toast migration |
| 23 | Snackbar → toast migration (all files), StatusBadge 40+ statuses, Page transitions, Matter print view |
| 24 | Billing/Task/LFA detail pages wired, CONTEXT.md |
