# LegalEagle — React Admin App

Production-grade legal firm management system built with React 19, Vite 8, MUI v9, TanStack Query v5, React Router v7, Zustand v5, React Hook Form + Zod v4.

## Stack

| Layer | Technology |
|---|---|
| UI | MUI v9 (Ocean Depths / Navy Teal theme) |
| State | Zustand v5 (SSR-ready factory pattern) |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form v7 + Zod v4 |
| Routing | React Router v7 |
| Auth | JWT + Microsoft MSAL v5 |
| i18n | i18next (EN + AR / RTL) |
| Charts | ApexCharts (lazy-loaded) |
| Calendar | FullCalendar v6 |

## Quick start

```bash
unzip legaleagle-phase8.zip -d legaleagle
cd legaleagle
npm install
cp .env.example .env      # edit VITE_API_BASE_URL
npm run dev               # http://localhost:3000
```

## Environment variables

See `.env.example` for all variables. Minimum required:
```
VITE_API_BASE_URL=https://your-backend.example.com
```

## Project structure (Next.js App Router conventions)

```
src/
├── app/                   # Pages — mirrors Next.js app/ directory
│   ├── (auth)/            # Login, register, forgot-password
│   └── (dashboard)/       # All authenticated pages
├── components/
│   ├── data-grid/         # Generic DataGrid (filters, sort, export, RBAC)
│   ├── calendar/          # AppCalendar with click-to-table popover
│   ├── charts/            # Lazy-loaded ApexCharts wrapper
│   ├── filters/           # Reusable filter fields (user/matter/client async)
│   ├── forms/             # Controlled RHF+Zod wrappers
│   ├── layout/            # MainLayout, Sidebar, Toolbar, GlobalSearch
│   └── ui/                # Modal, Drawer, FormDrawer, Tabs, Can, StatusBadge
├── lib/
│   ├── api/               # Axios instances (JSON + Blob), interceptors
│   ├── auth/              # JWT decode, MSAL config, permissions resolver
│   ├── i18n/              # i18next config + EN/AR locales
│   ├── query/             # TanStack QueryClient + typed key factory
│   ├── store/             # authStore, themeStore, stopwatchStore
│   ├── utils/             # formatDate, formatCurrency, downloadBlob, OneDrive
│   └── validations/       # Zod schemas for all entities
├── middleware/            # Auth + RBAC middleware (React Router loaders)
├── providers/             # AuthProvider, ThemeProvider, QueryProvider, I18n
├── hooks/                 # usePermission, useUrlState, useDebounce, etc.
└── config/                # featureFlags, theme, navigation, permissions
```

## Migrating to Next.js

Designed for a 1:1 migration:
1. Delete `src/router.tsx` — replaced by file routing
2. Move `src/main.tsx` providers to `app/layout.tsx`
3. `VITE_*` → `NEXT_PUBLIC_*` (single grep)
4. Zustand `create()` is already SSR-safe — no changes needed

## RBAC

Backend-driven via:
- `GET /api/user/get/access/menu` — what the user can see
- `GET /api/group/get` — what actions they can perform

Joined in `src/lib/auth/permissions.ts`. Use `<Can do="leads:create">` or `usePermission('leads:create')` anywhere.

## Theme

Ocean Depths + Fuse Navy Teal palette. Swap in `src/config/theme.ts`:
```ts
primary:   { main: '#0F3C6E' }   // Deep navy
secondary: { main: '#00B4A6' }   // Teal
```
