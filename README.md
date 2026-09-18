# LegalEagle LMS — Legal Management System

A production-grade React TypeScript admin application for UAE law firms.
Built as a fully BE-agnostic frontend — runs in static demo mode or connects to a real backend.

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://www.typescriptlang.org)
[![MUI](https://img.shields.io/badge/MUI-v9-007FFF)](https://mui.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev)

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.development.example .env

# Start dev server (static mode — no backend required)
npm run dev
```

**Default login (static mode):**
- Email: `admin@legaleagle.com`
- Password: `password`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript ~6 |
| Build | Vite 8 |
| UI | MUI v9.1 (Material UI) |
| Routing | React Router v7 |
| State | Zustand v5 |
| Server State | TanStack Query v5 |
| Forms | React Hook Form v7 + Zod v4 |
| Charts | ApexCharts 5 |
| Calendar | FullCalendar 6 |
| Rich Text | TipTap |
| i18n | i18next 26 (EN + AR/RTL) |
| PWA | VitePWA |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://testapi.alshamsilegallms.com` | Backend API URL |
| `VITE_USE_STATIC_DATA` | `true` | `true` = demo mode, no backend needed |
| `VITE_DYNAMIC_NAV` | `false` | Load sidebar nav from API |
| `VITE_ENABLE_LOGS` | `true` | Enable structured console logging |
| `VITE_FORCE_MICROSOFT_SSO` | `false` | Require Microsoft SSO login |
| `VITE_ENABLE_USER_REGISTRATION` | `false` | Allow self-registration |
| `VITE_AZURE_CLIENT_ID` | — | Azure app client ID (SSO) |
| `VITE_AZURE_TENANT_ID` | — | Azure tenant ID (SSO) |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          ← Login, register, forgot password
│   └── (dashboard)/     ← 58 authenticated pages
│       ├── dashboard/
│       ├── leads/       + [leadId]/ + _components/
│       ├── clients/     + [clientId]/ + _components/
│       ├── matters/     + [matterId]/ + print/ + check-conflict/
│       ├── billings/    + [invoiceId]/ + print/
│       ├── tasks/       + _components/
│       ├── timelogs/    (review, pre-approval, approval)
│       ├── time-log-entries/ + [entryId]/ + _components/
│       ├── lfa/         + [lfaId]/ + _components/
│       ├── reports/     (8 report pages with charts)
│       ├── budgeting/   (cost-cards, rate-cards, budget-cards)
│       ├── admin/       (users, groups, settings, locations, permissions)
│       ├── team/        + hearing-calendar/
│       ├── email/
│       ├── calendar/
│       └── profile/
│
├── api/                 ← BE wrappers (static-mode aware)
├── components/
│   ├── layout/          ← Sidebar, Toolbar, Notifications, FAB…
│   ├── ui/              ← EmptyState, PageShell, ErrorBoundary…
│   ├── data-grid/       ← Full-featured DataGrid (20+ features)
│   ├── forms/           ← Controlled form inputs
│   ├── charts/          ← ApexChart wrapper
│   └── filters/         ← SearchInput, DateRangeFilter…
├── data/static.ts       ← All static fixtures (demo mode)
├── hooks/               ← 14 custom hooks
├── lib/
│   ├── store/           ← Zustand stores (auth, theme, dashboard, stopwatch)
│   ├── api/axios.ts     ← Axios instance with auth interceptors
│   ├── auth/            ← JWT, permissions, MSAL
│   ├── i18n/            ← EN + AR translations (420 keys each)
│   ├── logger.ts        ← Env-gated structured logger
│   └── query/keys.ts    ← Typed query key factory
├── transformers/        ← BE → FE data shape normalization
└── config/
    ├── env.ts           ← Typed env variables
    ├── theme.ts         ← MUI theme (light/dark)
    └── navigation.ts    ← Static sidebar navigation
```

---

## Key Features

### DataGrid
Full-featured data table component with: server-side sort/filter/pagination, column visibility, density toggle, zebra striping, row expansion, right-click context menu, keyboard navigation (↑↓ Enter Ctrl+C), column drag-to-reorder, column drag-to-resize, column pinning, inline cell editing, filter presets, mobile card view, email dialog, CSV/PDF/Excel export, URL-synced state.

### Architecture
- **Static data mode** (`VITE_USE_STATIC_DATA=true`): entire app works without a backend using fixtures in `src/data/static.ts`
- **Transformer layer**: `src/transformers/` normalizes backend shapes before they reach the UI
- **BE-agnostic API layer**: all `src/api/*.ts` files check `env.USE_STATIC_DATA` before making HTTP calls
- **Typed query keys**: `QK` factory in `src/lib/query/keys.ts` prevents cache key typos

### i18n
Full English + Arabic translations. Toggle via the flag button in the toolbar. Arabic automatically enables RTL layout.

---

## Development Phases

| Phase | Key Deliverable |
|---|---|
| 12–19 | Auth, layout, all 57 pages, static data wiring |
| 20–29 | DataGrid upgrades, transformers, API layer, form guards |
| 30–33 | Empty state illustrations, keyboard shortcuts, push notifications |
| 34–37 | GlobalSearch, NProgress, Matter timeline, Kanban, Aging report |
| 38–42 | Single hamburger, DataGrid resize+reorder, 3-step Matter wizard |
| 43–45 | PageShell on all pages, charts on all reports, auth fix, 420 i18n keys |
| 46–47 | Profile with avatar upload, LFA signing, time entry detail |
| 48 | Production config, PWA manifest, README |

---

## Backend API

Swagger documentation: `https://testapi.alshamsilegallms.com/v2/api-docs`

To connect to the live backend:
```env
VITE_USE_STATIC_DATA=false
VITE_API_BASE_URL=https://testapi.alshamsilegallms.com
```

---

## Deployment

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The `dist/` folder is a standard SPA — deploy to any static host:
- **Vercel**: `vercel --prod`
- **Netlify**: drag `dist/` into Netlify dashboard
- **Nginx**: serve `dist/` with `try_files $uri $uri/ /index.html`
- **Docker**: `COPY dist/ /usr/share/nginx/html/`

> **SPA routing**: ensure your server returns `index.html` for all routes (not a 404).

---

## CONTEXT.md

See [`CONTEXT.md`](./CONTEXT.md) for a comprehensive developer onboarding guide covering architecture decisions, component patterns, and contribution guidelines.
