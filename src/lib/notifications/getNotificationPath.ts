import { resolveNavPath } from "@/lib/nav/legacyUrlMap"

export interface NotificationLike {
  id?: string
  title?: string
  message?: string
  content?: string
  description?: string
  read?: boolean
  isRead?: boolean
  createdAt?: string
  notificationType?: string
  type?: string
  relatedId?: string
  relatedToId?: string
  entityId?: string
  link?: string
  url?: string
  path?: string
  redirectUrl?: string
  href?: string
}

/** Pull first non-empty link-like field from a notification payload. */
function rawLinkFrom(n: NotificationLike): string | null {
  for (const key of ["link", "url", "path", "redirectUrl", "href"] as const) {
    const v = n[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return null
}

function toAppPath(raw: string): string | null {
  const s = raw.trim()
  if (!s || s === "#" || s.toLowerCase() === "javascript:void(0)") return null
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      return `${u.pathname}${u.search}${u.hash}` || null
    }
  } catch {
    return null
  }
  if (s.startsWith("/")) return s
  // Relative app paths from API (e.g. "leads/l1")
  if (!s.includes("://")) return `/${s.replace(/^\.\//, "")}`
  return null
}

/** Map legacy ticket edit URLs → `/tickets/:id`. */
function resolveLegacyTicketUrl(pathWithQuery: string): string | null {
  try {
    const u = new URL(pathWithQuery, "http://local")
    const m = u.pathname.match(/^\/edit\/tickets\/([^/]+)$/)
    if (m) return `/tickets/${encodeURIComponent(m[1])}`
  } catch {
    return null
  }
  return null
}

/**
 * Resolve notification click target.
 * Prefer API `link` / `url` / `path` (via legacy → v3 map); fall back to type + relatedId.
 */
export function getNotificationPath(n: NotificationLike): string | null {
  const raw = rawLinkFrom(n)
  if (raw) {
    const appPath = toAppPath(raw)
    if (appPath) {
      const ticket = resolveLegacyTicketUrl(appPath)
      if (ticket) return ticket
      // resolveNavPath handles hearing, approve-invoice, editor, and LEGACY_TO_V3
      try {
        const u = new URL(appPath, "http://local")
        const resolved = resolveNavPath(appPath)
        if (resolved) {
          // Preserve query when resolveNavPath only remapped the pathname
          if (resolved.includes("?")) return resolved
          return `${resolved}${u.search}${u.hash}`
        }
      } catch {
        const resolved = resolveNavPath(appPath)
        if (resolved) return resolved
      }
      return appPath
    }
  }

  const type = (n.notificationType ?? n.type ?? "").toLowerCase()
  const id = n.relatedId ?? n.relatedToId ?? n.entityId

  // Approval types before generic entity routes
  if (type.includes("approval") && type.includes("department") && type.includes("invoice")) {
    return id ? `/approvals/department-invoice?invoiceId=${encodeURIComponent(id)}` : "/approvals/department-invoice"
  }
  if (type.includes("approval") && type.includes("invoice")) {
    return id ? `/approvals/invoice?invoiceId=${encodeURIComponent(id)}` : "/approvals/invoice"
  }
  if (type.includes("approval") && type.includes("lfa")) return "/approvals/lfa"
  if (type.includes("approval") && type.includes("task")) {
    return id ? `/tasks/${encodeURIComponent(id)}?forApproval=1` : "/approvals/task"
  }
  if (type.includes("approval")) return "/approvals/task"

  if (type.includes("lfa") && id) return `/lfa/${encodeURIComponent(id)}`
  if (type.includes("matter") && id) return `/matters/${encodeURIComponent(id)}`
  if (type.includes("lead") && id) return `/leads/${encodeURIComponent(id)}`
  if (type.includes("task") && id) return `/tasks/${encodeURIComponent(id)}`
  if (type.includes("invoice") && id) return `/billings/${encodeURIComponent(id)}`
  if (type.includes("client") && id) return `/clients/${encodeURIComponent(id)}`
  if (type.includes("hearing") && id) {
    return `/hearings/${encodeURIComponent(id)}`
  }
  if (type.includes("ticket") && id) return `/tickets/${encodeURIComponent(id)}`
  if (type.includes("timelog") && id) return `/time-log-entries/${encodeURIComponent(id)}`
  if (type.includes("time") && id) return `/time-log-entries/${encodeURIComponent(id)}`

  return null
}
