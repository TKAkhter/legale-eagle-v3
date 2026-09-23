/**
 * Build sidebar NavItems from /user/get/access/menu (old LMS Fuse shape).
 */
import type { NavItem } from "@/config/navigation"
import { navigationConfig } from "@/config/navigation"
import { resolveNavPath, normalizeMenuUrl } from "./legacyUrlMap"

type RawMenu = {
  id?: string
  menuId?: string
  submenuId?: string
  menuName?: string
  submenuName?: string
  url?: string
  seqno?: number
  menuIcon?: string | null
  submenu?: RawMenu[]
  children?: RawMenu[]
  accessPermission?: { visible?: boolean }
}

export type BuildNavOptions = {
  /** ROLE_SUB_ADMIN: hide items with accessPermission.visible === false */
  filterVisible?: boolean
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
  // Prefer longest matching path prefix for icons
  const prefix = [...flat]
    .filter(i => i.path && path.startsWith(i.path!))
    .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0]
  return prefix?.icon
}

function titleOf(raw: RawMenu): string {
  return raw.menuName || raw.submenuName || "Menu"
}

function idOf(raw: RawMenu, fallback: string): string {
  return String(raw.id ?? raw.menuId ?? raw.submenuId ?? fallback)
}

function childList(raw: RawMenu): RawMenu[] {
  const list = Array.isArray(raw.submenu) ? raw.submenu
    : Array.isArray(raw.children) ? raw.children
    : []
  return [...list].sort((a, b) => (a.seqno ?? 9999) - (b.seqno ?? 9999))
}

function toNavItem(raw: RawMenu, index: number, filterVisible: boolean): NavItem | null {
  if (filterVisible && raw.accessPermission && raw.accessPermission.visible === false) return null

  const kids = childList(raw)
    .map((child, i) => toNavItem(child, i, filterVisible))
    .filter((x): x is NavItem => !!x)

  const path = resolveNavPath(raw.url)
  const title = titleOf(raw)
  const id = idOf(raw, `menu-${index}-${title}`)

  if (!path && !kids.length) return null

  // Groups with children should not also navigate to a path (avoids dual-active)
  return {
    id,
    title,
    path: kids.length ? undefined : (path || undefined),
    icon: iconForPath(path || kids[0]?.path || "") ?? "FolderOutlined",
    children: kids.length ? kids : undefined,
  }
}

/**
 * Convert API menu list → NavItem[] (same order as old LMS FuseUtils.generateNavigation).
 */
export function buildNavFromMenu(menuItems: unknown[], opts: BuildNavOptions = {}): NavItem[] {
  const filterVisible = Boolean(opts.filterVisible)
  let raw = (Array.isArray(menuItems) ? menuItems : []) as RawMenu[]

  // Old Fuse: only top-level rows where submenu is an array
  const parents = raw.filter(m => Array.isArray(m.submenu))
  if (parents.length) raw = parents

  const sorted = [...raw].sort((a, b) => (a.seqno ?? 9999) - (b.seqno ?? 9999))

  // Strip Settings / Reports from API list then re-append (old FuseNavigation)
  const filtered = sorted.filter((m) => {
    const name = (m.menuName ?? "").toLowerCase()
    return name !== "settings" && name !== "reports"
  })

  const items = filtered
    .map((m, i) => toNavItem(m, i, filterVisible))
    .filter((x): x is NavItem => !!x)
    .filter((item) => {
      if (!filterVisible) return true
      // Keep parents that still have children or a path
      return Boolean(item.path) || Boolean(item.children?.length)
    })

  items.push({
    id: "reports-fallback",
    title: "Reports",
    path: "/reports/wip",
    icon: "BarChartOutlined",
  })
  items.push({
    id: "settings-fallback",
    title: "Settings",
    path: "/admin/settings",
    icon: "SettingsOutlined",
  })

  return items
}

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
