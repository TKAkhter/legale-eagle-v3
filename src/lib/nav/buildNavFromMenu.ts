/**
 * Build sidebar NavItems from /user/get/access/menu (old LMS Fuse shape).
 * Supports both `submenu` (BE) and `children` (typed) trees.
 */
import type { NavItem } from "@/config/navigation"
import { navigationConfig } from "@/config/navigation"
import { resolveNavPath, normalizeMenuUrl } from "./legacyUrlMap"

type RawMenu = {
  id?: string
  menuId?: string
  menuName?: string
  submenuName?: string
  url?: string
  seqno?: number
  menuIcon?: string | null
  submenu?: RawMenu[]
  children?: RawMenu[]
  accessPermission?: { visible?: boolean }
}

function iconForPath(path: string): string | undefined {
  const flat: NavItem[] = []
  function walk(items: NavItem[]) {
    for (const item of items) {
      flat.push(item)
      if (item.children) walk(item.children)
    }
  }
  walk(navigationConfig)
  const exact = flat.find(i => i.path === path)
  if (exact?.icon) return exact.icon
  const prefix = flat.find(i => i.path && path.startsWith(i.path))
  return prefix?.icon
}

function titleOf(raw: RawMenu): string {
  return raw.menuName || raw.submenuName || "Menu"
}

function idOf(raw: RawMenu, fallback: string): string {
  return String(raw.id ?? raw.menuId ?? fallback)
}

function childList(raw: RawMenu): RawMenu[] {
  const list = Array.isArray(raw.submenu) ? raw.submenu
    : Array.isArray(raw.children) ? raw.children
    : []
  return [...list].sort((a, b) => (a.seqno ?? 9999) - (b.seqno ?? 9999))
}

function toNavItem(raw: RawMenu, index: number): NavItem | null {
  if (raw.accessPermission && raw.accessPermission.visible === false) return null

  const kids = childList(raw)
    .map((child, i) => toNavItem(child, i))
    .filter((x): x is NavItem => !!x)

  const path = resolveNavPath(raw.url)
  const title = titleOf(raw)
  const id = idOf(raw, `menu-${index}-${title}`)

  // Skip settings/reports orphans that old Fuse re-appended separately —
  // we still include them if they have a resolvable path.
  if (!path && !kids.length) return null

  return {
    id,
    title,
    path: kids.length ? undefined : (path || undefined),
    icon: iconForPath(path) ?? "FolderOutlined",
    children: kids.length ? kids : undefined,
  }
}

/**
 * Convert API menu list → NavItem[] (same order as old LMS).
 * Always append Reports + Settings if not already present (old Fuse behavior).
 */
export function buildNavFromMenu(menuItems: unknown[]): NavItem[] {
  const raw = (Array.isArray(menuItems) ? menuItems : []) as RawMenu[]
  const sorted = [...raw].sort((a, b) => (a.seqno ?? 9999) - (b.seqno ?? 9999))

  const items = sorted
    .map((m, i) => toNavItem(m, i))
    .filter((x): x is NavItem => !!x)

  const hasReports = items.some(i =>
    normalizeMenuUrl(i.path).startsWith("/reports")
    || i.title.toLowerCase().includes("report")
    || i.children?.some(c => normalizeMenuUrl(c.path).startsWith("/reports")),
  )
  const hasSettings = items.some(i =>
    i.path === "/admin/settings"
    || i.title.toLowerCase() === "settings"
    || i.children?.some(c => c.path === "/admin/settings"),
  )

  if (!hasReports) {
    items.push({
      id: "reports-fallback",
      title: "Reports",
      path: "/reports/wip",
      icon: "BarChartOutlined",
    })
  }
  if (!hasSettings) {
    items.push({
      id: "settings-fallback",
      title: "Settings",
      path: "/admin/settings",
      icon: "SettingsOutlined",
    })
  }

  return items
}

/** Flatten all URLs (raw + remapped) from a menu tree for permission filtering. */
export function flattenMenuUrls(menuItems: unknown[]): string[] {
  const urls: string[] = []
  function walk(list: RawMenu[]) {
    for (const item of list) {
      if (item.url) urls.push(item.url)
      walk(childList(item))
    }
  }
  walk((Array.isArray(menuItems) ? menuItems : []) as RawMenu[])
  return urls
}
