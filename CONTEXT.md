# LegalEagle — Full Project Context

> Share this file at the start of every new chat to give the AI full context.
> Keep it updated as the project evolves.

---

## What This Project Is

**LegalEagle** is a React + TypeScript admin application built for a Dubai legal firm.

More importantly, it is being built as a **reusable Enterprise React Starter Kit** — the first of multiple enterprise apps (CRM, ERP, HRMS) that will be built on the same platform. The legal management use case is the first implementation. Future apps swap out `src/features/` and branding while keeping ~85% of the platform unchanged.

**Live backend Swagger:** `https://testapi.alshamsilegallms.com/v2/api-docs`

---

## Tech Stack (exact versions)

| Layer | Library | Version |
|---|---|---|
| Framework | React | ^19.2.6 |
| Language | TypeScript | ~6.0.2 |
| Build | Vite | ^8.0.12 |
| UI | MUI (Material UI) | ^9.1.1 |
| Routing | React Router | ^7.17.0 |
| Server state | TanStack Query | ^5.101.0 |
| Forms | React Hook Form | ^7.78.0 |
| Validation | Zod | ^4.4.3 |
| UI state | Zustand | ^5.0.14 |
| HTTP | Axios | ^1.17.0 |
| i18n | i18next | ^26.3.1 |
| Charts | ApexCharts | ^5.14.0 |
| Calendar | FullCalendar | ^6.1.20 |
| Mock API | MSW (Mock Service Worker) | ^2.14.6 |
| Component docs | Storybook | ^10.4.6 |
| Auth (MS) | MSAL | ^5.x |

**Key MUI v9 rules** (breaking changes vs v6/v7):
- Shorthand props (`display`, `gap`, `mb` etc.) on `<Box>` are NOT valid — use `sx={{ display: ..., gap: ... }}`
- `InputProps`, `InputLabelProps`, `PaperProps` → use `slotProps` API
- `primaryTypographyProps` on `ListItemText` → use `sx` or `slotProps.primary`
- `Typography` shorthand props like `fontWeight={600}` → use `sx={{ fontWeight: 600 }}`

---

## Project Philosophy (non-negotiable)

1. **Readability over reusability** — Some duplication is fine if it makes code clearer
2. **Simplicity over cleverness** — No magic, no complex abstractions
3. **Feature ownership** — Each feature is self-contained; no cross-feature imports of internals
4. **Junior developer friendly** — A new dev should understand any file in minutes
5. **Next.js ready** — Structure mirrors Next.js App Router so migration is rename + router swap

---

## Folder Structure

```
src/
├── app/                        # Route shells ONLY (3-10 lines each)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   └── (dashboard)/
│       ├── dashboard/page.tsx
│       ├── leads/page.tsx
│       ├── leads/[leadId]/page.tsx
│       ├── clients/page.tsx
│       ├── clients/[clientId]/page.tsx
│       ├── matters/page.tsx
│       ├── matters/[matterId]/page.tsx
│       ├── matters/check-conflict/page.tsx
│       ├── billing/page.tsx
│       ├── billings/[invoiceId]/page.tsx
│       ├── tasks/page.tsx
│       ├── tasks/[taskId]/page.tsx
│       ├── timelogs/review/page.tsx
│       ├── timelogs/pre-approval/page.tsx
│       ├── timelogs/approval/page.tsx
│       ├── lfa/page.tsx
│       ├── lfa/[lfaId]/page.tsx
│       ├── lfa/client/page.tsx
│       ├── lfa/default/page.tsx
│       ├── lfa/reports/page.tsx
│       ├── reports/wip/page.tsx
│       ├── reports/matter-billing/page.tsx
│       ├── reports/billed-amount/page.tsx
│       ├── reports/utilization/page.tsx
│       ├── reports/activity-history/page.tsx
│       ├── reports/margin-erosion/page.tsx
│       ├── reports/collections/page.tsx
│       ├── calendar/page.tsx
│       ├── team/page.tsx
│       ├── team/hearing-calendar/page.tsx
│       ├── admin/users/page.tsx
│       ├── admin/groups/page.tsx
│       ├── admin/permissions/page.tsx
│       ├── admin/locations/page.tsx
│       ├── admin/settings/page.tsx
│       ├── budgeting/cost-cards/page.tsx
│       ├── budgeting/budget-cards/page.tsx
│       ├── budgeting/rate-cards/page.tsx
│       ├── approvals/invoice/page.tsx
│       ├── approvals/lfa/page.tsx
│       ├── approvals/task/page.tsx
│       └── integrations/onedrive/page.tsx
│
├── features/                   # Business logic (feature-first)
│   ├── leads/
│   │   ├── api/
│   │   │   ├── leads.types.ts        # Application models (never raw backend DTOs)
│   │   │   └── leads.api.ts          # API wrapper (only file that calls axiosClient for leads)
│   │   ├── hooks/
│   │   │   └── useLeads.ts           # TanStack Query hooks
│   │   ├── pages/
│   │   │   └── LeadListPage.tsx      # Page component (imported by app shell)
│   │   ├── components/               # Feature-specific UI (LeadFormDrawer etc)
│   │   ├── mock/
│   │   │   └── leads.mock.ts         # MSW handlers for this feature
│   │   ├── schemas/
│   │   │   └── lead.schema.ts        # Zod validation schemas
│   │   └── index.ts                  # Public exports ONLY
│   ├── clients/      (same structure)
│   ├── matters/      (same structure)
│   ├── billing/      (same structure)
│   ├── tasks/        (same structure)
│   ├── timelogs/     (same structure)
│   ├── dashboard/    (same structure)
│   ├── lfa/          (same structure)
│   ├── reports/      (mock only — pages use shared ReportPage)
│   ├── admin/        (api + mock)
│   └── auth/         (api + mock)
│
├── ui/                         # Shared UI components (ZERO business logic)
│   ├── Widget/Widget.tsx       # Detail page card component
│   ├── Page/Page.tsx           # Standard page layout
│   ├── EmptyState/EmptyState.tsx
│   └── index.ts                # Re-exports Widget, Page, EmptyState +
│                               # delegates to src/components/ for DataGrid, Forms, etc
│
├── infrastructure/             # Technical services (index.ts re-exports from src/lib/)
│
├── components/                 # LEGACY — being migrated to src/ui/
│   ├── data-grid/              # DataGrid, ReportPage, types
│   ├── forms/                  # ControlledInput, ControlledSelect, etc.
│   ├── filters/                # DateRangeFilter, SearchInput, etc.
│   ├── layout/                 # MainLayout, Sidebar, Toolbar, GlobalSearch
│   └── ui/                     # StatusBadge, Modal, FormDrawer, Tabs, Can, etc.
│
├── lib/                        # LEGACY — being migrated to src/infrastructure/
│   ├── api/axios.ts            # Axios instances (apiClient, blobClient)
│   ├── auth/                   # jwt.ts, msal.ts, permissions.ts
│   ├── store/                  # authStore, themeStore, stopwatchStore (Zustand)
│   ├── query/                  # queryClient.ts, keys.ts (QK factory)
│   ├── i18n/                   # i18next config + EN/AR locales
│   └── utils/                  # formatDate, formatCurrency, downloadBlob, onedrive
│
├── mocks/
│   ├── handlers.ts             # Combines all feature mock handlers
│   └── browser.ts              # MSW worker setup
│
├── config/
│   ├── theme.ts                # MUI theme (Ocean Depths + Navy Teal palette)
│   ├── featureFlags.ts         # VITE_* env vars
│   ├── navigation.ts           # Sidebar nav config
│   └── permissions.ts          # Permission constants
│
├── providers/                  # App-level providers
├── middleware/                 # Auth + RBAC route guards
├── hooks/                      # usePermission, useUrlState, useDebounce, useFormSubmit
├── types/                      # Global types (PaginatedResponse, GridParams)
└── router.tsx                  # React Router v7 config (50 routes)
```

**Next.js Migration Path:**
1. `src/app/` → `app/` (route shells stay identical, just file-based routing)
2. `src/router.tsx` → deleted (replaced by file system)
3. `VITE_*` → `NEXT_PUBLIC_*` (single grep+replace)
4. `src/features/`, `src/ui/`, `src/infrastructure/` → unchanged

---

## Architecture Rules (enforce strictly)

```
✅ Page → Feature Hook → Feature API Wrapper → axiosClient → Backend
✅ Feature pages import from feature api/hooks (never from other features)
✅ Shared UI (src/ui/, src/components/) has ZERO business logic
✅ All MSW handlers live in src/features/*/mock/ and are combined in src/mocks/handlers.ts
✅ TanStack Query owns all server state
✅ Zustand owns UI state only (sidebar, theme, stopwatch)
✅ React Hook Form + Zod for all forms

❌ Never call axiosClient directly from a page component
❌ Never import feature internals from another feature (use index.ts exports only)
❌ Never put business logic in src/ui/ components
❌ Never store API data in Zustand
❌ Never use console.log in production code
❌ Never leave TypeScript errors or ESLint errors
```

---

## Data Flow (canonical pattern)

```
User Action
    ↓
Page Component (thin — just layout + hook calls)
    ↓
Feature Hook (useLeads, useCreateLead, etc.)
    ↓
Feature API Wrapper (leadsApi.getAll, leadsApi.create)
    ↓
axiosClient (src/lib/api/axios.ts)
    ↓
MSW (dev/test) OR Real Backend (production)

Response path:
Backend → axiosClient → API Wrapper (transforms to app model) → TanStack Query cache → Hook → Page
```

---

## Design System

**Theme:** Ocean Depths + Fuse Navy Teal
```
Primary:   #0F3C6E  (deep navy)
Secondary: #00B4A6  (teal)
Sidebar:   #0F2744  (dark navy background)
Font:      IBM Plex Sans (LTR) / IBM Plex Sans Arabic (RTL)
```

**Design principles (from web-artifacts-builder skill):**
- No excessive uniform rounded corners
- No purple/indigo gradients (we use navy/teal)
- No everything-centered layouts
- Tables are sharp; cards are subtly rounded (borderRadius: 8)
- Ocean Depths palette: professional, trust-building, enterprise

**Shared components available:**
- `<Page title="..." action={<Button>}>` — standard page wrapper
- `<Widget title="...">` — detail page card
- `<DataGrid columns queryKey queryFn FilterPanel>` — enterprise table
- `<FormDrawer open onClose onSubmit>` — slide-in form panel
- `<StatusBadge status="..." />` — consistent status chips
- `<EmptyState title description action>` — empty states
- `<Can do="leads:create">` — permission-based rendering
- `<ControlledInput|Select|DatePicker|AsyncSelect|Checkbox>` — RHF wrappers
- `<FormSection title>` — form grouping

---

## Authentication & Authorization

**Flow:**
1. `POST /api/auth/signin` → JWT token + user object
2. Token stored in `authStore` (Zustand, persisted to sessionStorage)
3. Axios interceptor attaches `Authorization: Bearer {token}` to every request
4. On 401: refresh token via `POST /api/auth/refresh/token`, queue pending requests
5. On refresh failure: clear auth, redirect to `/login`

**RBAC (two-endpoint pattern):**
- `GET /api/user/get/access/menu` → menu items (visibility)
- `GET /api/group/get` → group permissions (`add`, `edit`, `delete`, `visible` per menuId)
- Both fetched in parallel by `AuthProvider` on login, joined by `menuId`
- ADMIN users get `buildAdminPermissions()` (full set as safety net)
- **Race condition fix:** `rbacMiddleware` skips check when permissions set is empty but token exists (loading state) — prevents `/403` on hard refresh

**Microsoft SSO:** Supported via MSAL v5. Set `VITE_FORCE_MICROSOFT_SSO=true` to require it.

---

## State Management

| State type | Tool | Location |
|---|---|---|
| Server data | TanStack Query | `features/*/hooks/` |
| UI state | Zustand | `src/lib/store/` |
| Form state | React Hook Form | Inside form components |
| Validation | Zod | `features/*/schemas/` |
| URL/routing | React Router | `src/router.tsx` |
| Theme pref | Zustand + localStorage | `themeStore.ts` |

---

## Mock API (MSW)

The app runs **completely without a backend** using MSW.

**Test credentials:**
- Email: `admin@legaleagle.com`
- Password: `password`

**Handler locations:**
```
src/features/auth/mock/auth.mock.ts        — login, menu, groups
src/features/leads/mock/leads.mock.ts      — leads CRUD + followups
src/features/clients/mock/clients.mock.ts  — clients CRUD + search
src/features/matters/mock/matters.mock.ts  — matters CRUD + hearings
src/features/billing/mock/billing.mock.ts  — invoices + payments + PDF/Word
src/features/tasks/mock/tasks.mock.ts      — tasks CRUD + approval
src/features/timelogs/mock/timelogs.mock.ts — time logs + stopwatch
src/features/dashboard/mock/dashboard.mock.ts — KPIs + charts
src/features/lfa/mock/lfa.mock.ts          — LFA CRUD + approval
src/features/reports/mock/reports.mock.ts  — all report endpoints (empty data)
src/features/admin/mock/admin.mock.ts      — users + groups + lookups + notifications
```

All combined in `src/mocks/handlers.ts` → registered in `src/mocks/browser.ts`.

---

## Key Implemented Features

### Fully wired (API + UI + Mock)
- ✅ Login / Logout / Forgot Password / Microsoft SSO
- ✅ Dashboard (KPI cards, 3 ApexCharts, upcoming hearings, widget customizer)
- ✅ Leads — list, detail, create/edit form, followup timeline, convert to client, write-off
- ✅ Clients — list, detail, create/edit form, LFAs tab, OneDrive integration
- ✅ Matters — list, detail, create/edit form, hearings tab, invoices tab, close dialog, conflict check
- ✅ Billing / Invoices — list, detail, create (with activity selector), pay, PDF, Word, email
- ✅ Tasks — list, detail, create/edit form, priority color coding, approval queue
- ✅ Time Logs — review / pre-approval / HOD approval with bulk approve
- ✅ LFA — list, detail, create/edit form, client/default views, billing+referral reports, approval
- ✅ Reports — WIP, billed amount, matter billing, utilization, activity history, margin erosion, collections
- ✅ Calendar — full FullCalendar with hearing events, click-to-table popover
- ✅ Team — user list, hearing calendar
- ✅ Admin: Users (invite, edit, block, reset password, extra permissions)
- ✅ Admin: Groups (create, permissions matrix)
- ✅ Admin: Settings (practice areas, lead sources, departments, designations, session rates — LookupManager)
- ✅ Admin: Locations CRUD
- ✅ Admin: Permissions matrix (checkbox grid per group per menu)
- ✅ Budgeting: cost cards, rate cards, budget cards
- ✅ Approvals: invoice, LFA, task queues
- ✅ OneDrive integration (auto-register folder on Lead/Client/Matter create)
- ✅ Notifications panel (real-time polling, mark read)
- ✅ Global search (Ctrl+K, searches leads + clients + matters in parallel)
- ✅ Stopwatch widget (page-load sync, start/pause/resume/end)
- ✅ Dark mode + RTL (Arabic) support

### Partial (API wrapper + mock exist, hooks not yet created)
- ⚠️ billing, tasks, timelogs, dashboard, lfa, admin — `hooks/` folder is empty
  - API wrappers and MSW mocks are complete
  - Hooks need to be created following the `useLeads.ts` / `useClients.ts` / `useMatters.ts` pattern

### Not yet started
- ❌ My Leads page (`/my-leads`) — stub
- ❌ Storybook stories for feature-level pages
- ❌ Unit tests (Vitest + React Testing Library configured but no tests written)
- ❌ E2E tests (Playwright not yet set up)

---

## Migration Status (src/components → src/ui)

The restructure created `src/ui/` as the new shared UI layer, but migration is **partially complete**:

```
✅ src/ui/Widget/         — NEW, implemented
✅ src/ui/Page/           — NEW, implemented
✅ src/ui/EmptyState/     — NEW, implemented
✅ src/ui/index.ts        — re-exports everything (including from src/components/)

⚠️  src/components/       — LEGACY (50 files), still works, being phased out
    All existing pages still import from @components/* aliases — this is fine.
    New feature pages should import from @/ui instead.
```

**When adding new shared components:**
- Create in `src/ui/ComponentName/ComponentName.tsx`
- Export from `src/ui/index.ts`
- Never put business logic in them

---

## Known Issues to Fix

1. **vite.config.ts TypeScript errors** — `@types/node` missing from tsconfig
   - Fix: add `"node"` to `compilerOptions.types` in `tsconfig.json`
   - Or run: `npm install --save-dev @types/node`

2. **Feature hooks missing** for: billing, tasks, timelogs, dashboard, lfa, admin
   - Pattern to follow: see `src/features/leads/hooks/useLeads.ts`
   - These features work currently because pages use `axiosClient` directly (old pattern)
   - Should be migrated to hooks pattern

3. **`src/components/` → `src/ui/` migration incomplete**
   - 50 legacy files in `src/components/` should eventually move to `src/ui/`
   - Not urgent — aliases keep everything working

4. **Feature pages not yet moved** from `src/app/(dashboard)/*/page.tsx` to `src/features/*/pages/`
   - Currently: feature pages in `src/features/*/pages/` are stubs that re-export from app pages
   - Should be: business logic moves to feature pages, app shells become 5-line re-exports

---

## Commands

```bash
# Install
npm install

# Dev server (uses MSW — no backend needed)
npm run dev          # → http://localhost:3000

# Storybook component explorer
npm run storybook    # → http://localhost:6006

# Production build
npm run build

# Type check only
npm run tsc --noEmit
```

---

## Environment Variables

```env
# Required
VITE_API_BASE_URL=https://testapi.alshamsilegallms.com

# Feature flags
VITE_ENABLE_USER_REGISTRATION=false
VITE_FORCE_MICROSOFT_SSO=false

# Microsoft Azure (needed for SSO + OneDrive)
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=http://localhost:3000
VITE_ONEDRIVE_CLIENT_ID=

# Environment
VITE_APP_ENV=development

# Tolgee (live translation management — optional)
VITE_TOLGEE_API_URL=
VITE_TOLGEE_API_KEY=
```

---

## How to Add a New Feature

Follow this exact sequence:

```
1. Create folder: src/features/my-feature/
   ├── api/my-feature.types.ts    — application models (not backend DTOs)
   ├── api/my-feature.api.ts      — API wrapper (calls axiosClient)
   ├── hooks/useMyFeature.ts      — TanStack Query hooks
   ├── pages/MyFeaturePage.tsx    — page component
   ├── components/                — feature-specific UI
   ├── mock/my-feature.mock.ts    — MSW handlers
   ├── schemas/my-feature.schema.ts — Zod schemas
   └── index.ts                   — public exports only

2. Add mock handlers to src/mocks/handlers.ts

3. Create thin app shell: src/app/(dashboard)/my-feature/page.tsx
   → imports from feature: import { MyFeaturePage } from "@/features/my-feature"

4. Add route to src/router.tsx

5. Add navigation entry to src/config/navigation.ts
```

---

## Swagger / Backend API

Live Swagger: `https://testapi.alshamsilegallms.com/v2/api-docs`

Key implemented endpoints:
```
POST /api/auth/signin
GET  /api/user/get/access/menu
GET  /api/group/get
GET  /api/leads/list/filter
POST /api/leads/add + /api/leads/edit + /api/leads/convert
GET  /api/client/filter
POST /api/client/add + /api/client/edit
POST /api/report/matter/mini/filter/page/v2
POST /api/matter/add + /api/matter/edit + /api/matter/close
POST /api/invoice/filter/all/v2
POST /api/invoice/add + /api/invoice/pay
GET  /api/invoice/convert/pdf + /api/invoice/convert/word
POST /api/invoice/send/email
POST /api/activity/add/v2
POST /api/activity/approve
GET  /api/task/get/all
POST /api/task/add + /api/task/approve
GET  /api/lfa/filter/page
POST /api/lfa/add + /api/lfa/edit
GET  /api/notification/get
PUT  /api/notification/read/all + /api/notification/read/:id
GET  /api/dashboard/lead/count + /matter/count + /task/count
GET  /api/analytics/graph/matters-history-monthly
GET  /api/analytics/graph/fixedfees-timelogs-revenue
GET  /api/analytics/graph/timelogs-summary-per-category
POST /api/conflict/check/multiple/mini/v2
POST /api/onedrive/folder/register
POST /api/user/sendRequest (invite)
POST /api/user/edit + /api/user/change/password/admin
GET  /api/user/get + /api/user/get/min
PUT  /api/user/block/:id
POST /api/group/add + /api/group/add/individual/permission
[all 7 report endpoints]
[all 3 timelog approval endpoints]
```

**Backend quirks to be aware of:**
- Some endpoints return `HTTP 500` with the real error status inside the body
- Response shapes are inconsistent — always use transformers in `*.api.ts`
- Pagination convention varies: some use `pageNumber/pageSize`, some use `page/size`
- The existing `buildQueryParams()` utility handles these differences

---

## Previous Work Sessions Summary

Phases 1–8 built the complete app (all pages, all features, full CRUD, MSW, Storybook).

The final restructure session (current ZIP: `legaleagle-restructured.zip`) added:
- `src/features/` layer with proper api/hooks/mock/types isolation
- `src/ui/` layer with Widget, Page, EmptyState components
- `src/mocks/handlers.ts` combining all feature-owned mock handlers
- Updated `vite.config.ts` with `@/features`, `@/ui`, `@/infrastructure` aliases

The app builds with zero TypeScript errors and runs fully on MSW without a backend.
